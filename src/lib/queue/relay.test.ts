import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ findMany: vi.fn(), updateMany: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { backgroundJob: h } }));
vi.mock('./client', () => ({ getQueueClient: () => ({ send: h.send }) }));
import { relayBackgroundJobs } from './relay';
beforeEach(() => {
	vi.resetAllMocks(); vi.stubEnv('PHASE26_ENABLED', 'true'); vi.stubEnv('VERCEL', '1');
	h.findMany.mockResolvedValue([{ id: 'job', kind: 'EMAIL', attempts: 0, replayCount: 0, nextAttemptAt: new Date() }]);
	h.updateMany.mockResolvedValue({ count: 1 }); h.send.mockResolvedValue({ messageId: 'message' });
});
afterEach(() => vi.unstubAllEnvs());
it('sends only the durable reference and records acceptance', async () => {
	await expect(relayBackgroundJobs()).resolves.toMatchObject({ published: 1 });
	expect(h.send).toHaveBeenCalledWith('email-outbox', { jobId: 'job' }, expect.objectContaining({ idempotencyKey: expect.stringMatching(/^job:0:0:/) }));
});
it('retains the committed job when the transport is unavailable', async () => {
	h.send.mockRejectedValue(new Error('private-token'));
	await expect(relayBackgroundJobs()).resolves.toMatchObject({ failed: 1 });
	expect(h.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 'job', status: 'READY' }, data: expect.objectContaining({ nextPublishAt: expect.any(Date), lastError: expect.not.stringContaining('private-token') }) }));
});
it('distinguishes missing OIDC credentials from broker authorization failures', async () => {
	h.send.mockRejectedValue(new Error('Failed to get OIDC token. private-token'));
	await relayBackgroundJobs();
	expect(h.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastError: expect.stringContaining('OIDC_TOKEN_UNAVAILABLE') }) }));
	const error = new Error('private-response'); error.name = 'ForbiddenError';
	h.send.mockRejectedValue(error);
	await relayBackgroundJobs();
	expect(h.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastError: expect.stringContaining('BROKER_FORBIDDEN') }) }));
});
it('does not send when another relay owns the publishing lease', async () => {
	h.updateMany.mockResolvedValue({ count: 0 }); await relayBackgroundJobs(); expect(h.send).not.toHaveBeenCalled();
});
it('uses a new idempotency generation after a manual replay', async () => {
	h.findMany.mockResolvedValue([{ id: 'job', kind: 'EMAIL', attempts: 0, replayCount: 1, nextAttemptAt: new Date() }]);
	await relayBackgroundJobs();
	expect(h.send).toHaveBeenCalledWith('email-outbox', { jobId: 'job' }, expect.objectContaining({ idempotencyKey: expect.stringMatching(/^job:1:0:/) }));
});
it('publishes delayed checkpoints with enough retention after their wake-up time', async () => {
	const due = new Date(Date.now() + 60 * 60_000);
	h.findMany.mockResolvedValue([{ id: 'job', kind: 'WORKFLOW', attempts: 0, replayCount: 0, nextAttemptAt: due }]);
	await relayBackgroundJobs();
	const options = h.send.mock.calls[0][2] as { delaySeconds: number; retentionSeconds: number };
	expect(options.delaySeconds).toBeGreaterThanOrEqual(3599);
	expect(options.retentionSeconds).toBeGreaterThan(options.delaySeconds);
});
