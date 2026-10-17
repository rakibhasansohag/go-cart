import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { db } from '../src/lib/db';
import { enqueueBackgroundJob } from '../src/lib/queue/jobs';
import { relayBackgroundJobs } from '../src/lib/queue/relay';
import { processBackgroundJob, withJobTransaction } from '../src/lib/queue/worker';

// Real database, SDK, HTTP failure and worker. The loopback endpoint is a
// controlled transport surrogate, not a claim about a Vercel provider outage.
const database = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/gocart_e2e');
assert.equal(process.env.EMAIL_NOTIFICATIONS_ENABLED, 'false');
assert.equal(process.env.PHASE26_ENABLED, 'true');
assert.notEqual(process.env.VERCEL, '1');
const prefix = `queue-transport-check:${randomUUID()}`;
const delivered: string[] = [];
const server = createServer(async (request, response) => {
  assert.equal(request.method, 'POST');
  assert.equal(request.url, '/api/v3/topic/notification-fan');
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const payload: unknown = JSON.parse(Buffer.concat(chunks).toString());
  assert(payload && typeof payload === 'object' && 'jobId' in payload && typeof payload.jobId === 'string');
  delivered.push(payload.jobId);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ messageId: `isolated-${randomUUID()}` }));
});
const close = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
let jobId: string | undefined;
try {
  // Avoid publishing unrelated E2E jobs through this run's transport endpoint.
  assert.equal(await db.backgroundJob.count({ where: { status: 'READY' } }), 0, 'Finish existing local jobs before this isolated drill.');
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  process.env.VERCEL_QUEUE_BASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.VERCEL_QUEUE_TOKEN = 'isolated-loopback-credential';
  await close();

  const job = await enqueueBackgroundJob(db, { eventKey: prefix, kind: 'NOTIFICATION', payload: {} });
  jobId = job.id;
  const failed = await relayBackgroundJobs();
  assert.equal(failed.failed, 1);
  const retained = await db.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(retained.status, 'READY');
  assert.equal(retained.attempts, 0);
  assert.equal(retained.messageId, null);
  assert(retained.nextPublishAt > new Date());
  assert(!retained.lastError?.includes(process.env.VERCEL_QUEUE_TOKEN));
  console.log(JSON.stringify({ check: 'outage retains committed job', status: retained.status, attempts: retained.attempts, retryAt: retained.nextPublishAt }));

  server.listen(address.port, '127.0.0.1');
  await once(server, 'listening');
  // Accelerate only this owned row's 60-second publication retry deadline.
  await db.backgroundJob.update({ where: { id: job.id }, data: { nextPublishAt: new Date() } });
  const restored = await relayBackgroundJobs();
  assert.equal(restored.published, 1);
  assert.deepEqual(delivered, [job.id]);
  const published = await db.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
  assert(published.messageId && published.publishedAt);

  let executions = 0;
  const effect: Parameters<typeof processBackgroundJob>[2] = async (row, token) => {
    await withJobTransaction(row, token, async tx => {
      executions++;
      await tx.domainEvent.create({ data: { eventKey: `${prefix}:effect`, eventType: 'queue.transport_check', aggregateType: 'BACKGROUND_JOB', aggregateId: row.id, payload: {} } });
    });
  };
  await processBackgroundJob(delivered[0], 'NOTIFICATION', effect);
  await processBackgroundJob(delivered[0], 'NOTIFICATION', effect);
  const completed = await db.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(completed.status, 'SUCCEEDED');
  assert.equal(completed.attempts, 1);
  assert.equal(executions, 1);
  assert.equal(await db.domainEvent.count({ where: { eventKey: `${prefix}:effect` } }), 1);
  console.log(JSON.stringify({ check: 'restoration and duplicate delivery', status: completed.status, attempts: completed.attempts, effects: executions, realDatabaseAndHttp: true, deployedProviderDrill: false }));
} finally {
  if (server.listening) await close();
  if (jobId) await db.backgroundJob.deleteMany({ where: { id: jobId, eventKey: prefix } });
  await db.domainEvent.deleteMany({ where: { eventKey: `${prefix}:effect` } });
  assert.equal(await db.backgroundJob.count({ where: { eventKey: prefix } }), 0);
  assert.equal(await db.domainEvent.count({ where: { eventKey: `${prefix}:effect` } }), 0);
  console.log('PASS: owned transport fixture and committed effect removed');
  await db.$disconnect();
}
