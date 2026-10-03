import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BackgroundJob } from '@prisma/client';
const h = vi.hoisted(() => ({ updateMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), alert: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { backgroundJob: h } }));
vi.mock('./alerts', () => ({ alertDeadJobs: h.alert }));
import { DeferredJob, processBackgroundJob, recoverExpiredJobs } from './worker';
const now = new Date();
const job: BackgroundJob = { id: 'job', eventKey: 'test', kind: 'PAYMENT', payload: {}, status: 'PROCESSING',
	attempts: 1, replayCount: 0, nextAttemptAt: now, nextPublishAt: now, leaseToken: 'token', leaseUntil: now,
	messageId: null, publishedAt: null, startedAt: now, completedAt: null, lastError: null, alertedAt: null, createdAt: now, updatedAt: now };
beforeEach(() => { vi.resetAllMocks(); h.updateMany.mockResolvedValue({ count: 1 }); h.findUniqueOrThrow.mockResolvedValue(job); });
afterEach(() => vi.unstubAllEnvs());
it('does not re-execute an already completed delivery', async () => {
	h.updateMany.mockResolvedValue({ count: 0 }); h.findUnique.mockResolvedValue({ ...job, status: 'SUCCEEDED' });
	const handler = vi.fn();
	await expect(processBackgroundJob(job.id, 'PAYMENT', handler)).resolves.toEqual({ skipped: true });
	expect(handler).not.toHaveBeenCalled();
});
it('refuses a simultaneous worker while its processing lease is live', async () => {
	h.updateMany.mockResolvedValue({ count: 0 }); h.findUnique.mockResolvedValue(job);
	const handler = vi.fn();
	await expect(processBackgroundJob(job.id, 'PAYMENT', handler)).rejects.toBeInstanceOf(DeferredJob);
	expect(handler).not.toHaveBeenCalled();
});
it('records failures durably with backoff and never stores provider secrets', async () => {
	await expect(processBackgroundJob(job.id, 'PAYMENT', async () => { throw new Error('secret-provider-key'); })).rejects.toThrow();
	expect(h.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
		where: expect.objectContaining({ leaseToken: expect.any(String) }),
		data: expect.objectContaining({ status: 'READY', leaseToken: null, nextAttemptAt: expect.any(Date), lastError: expect.not.stringContaining('secret-provider-key') }),
	}));
});
it('does not consume attempts while email delivery is deliberately disabled', async () => {
	await expect(processBackgroundJob(job.id, 'PAYMENT', async () => { throw new DeferredJob(new Date(Date.now() + 60_000)); })).rejects.toBeInstanceOf(DeferredJob);
	expect(h.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ attempts: { decrement: 1 }, status: 'READY' }) }));
});
it('dead-letters exhausted work and raises the admin alert', async () => {
	h.findUniqueOrThrow.mockResolvedValue({ ...job, attempts: 8 });
	await expect(processBackgroundJob(job.id, 'PAYMENT', async () => { throw new Error('failed'); })).resolves.toMatchObject({ dead: true });
	expect(h.alert).toHaveBeenCalled();
	expect(h.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DEAD' }) }));
});
it('recovers interrupted leases and dead-letters interrupted final attempts', async () => {
	await recoverExpiredJobs();
	expect(h.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PROCESSING', attempts: { lt: 8 } }), data: expect.objectContaining({ status: 'READY' }) }));
	expect(h.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PROCESSING', attempts: { gte: 8 } }), data: expect.objectContaining({ status: 'DEAD' }) }));
});
