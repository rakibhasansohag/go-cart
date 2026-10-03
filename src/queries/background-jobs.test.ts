import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), update: vi.fn(), counts: vi.fn(), jobs: vi.fn(), oldest: vi.fn(), schedule: vi.fn(), revalidate: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ auth: h.auth }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: h.user }, backgroundJob: { updateMany: h.update, groupBy: h.counts, findMany: h.jobs, findFirst: h.oldest } } }));
vi.mock('@/lib/queue/schedule', () => ({ scheduleBackgroundJobs: h.schedule }));
vi.mock('next/cache', () => ({ revalidatePath: h.revalidate }));
vi.mock('@/lib/queue/worker', () => ({ recoverExpiredJobs: vi.fn() }));
vi.mock('@/lib/queue/alerts', () => ({ alertDeadJobs: vi.fn() }));
import { getBackgroundJobHealth, replayBackgroundJob } from './background-jobs';
beforeEach(() => { vi.clearAllMocks(); h.auth.mockResolvedValue({ userId: 'actor' }); h.user.mockResolvedValue({ role: 'ADMIN', accountStatus: 'ACTIVE' }); h.update.mockResolvedValue({ count: 1 }); });
afterEach(() => vi.unstubAllEnvs());
it.each(['USER', 'SELLER'])('blocks %s from viewing or replaying jobs', async role => {
	h.user.mockResolvedValue({ role, accountStatus: 'ACTIVE' });
	await expect(getBackgroundJobHealth()).rejects.toThrow('Admin');
	await expect(replayBackgroundJob(new FormData())).rejects.toThrow('Admin');
	expect(h.jobs).not.toHaveBeenCalled(); expect(h.update).not.toHaveBeenCalled();
});
it('blocks suspended admins and signed-out users', async () => {
	h.user.mockResolvedValue({ role: 'ADMIN', accountStatus: 'SUSPENDED' });
	await expect(getBackgroundJobHealth()).rejects.toThrow('Admin');
	h.auth.mockResolvedValue({ userId: null });
	await expect(getBackgroundJobHealth()).rejects.toThrow('Unauthenticated');
});
it('replays only waiting or failed work and increments the transport generation', async () => {
	const form = new FormData(); form.set('jobId', '69cb7ccf-6461-4375-b37a-489f1db68d23');
	await replayBackgroundJob(form);
	expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: form.get('jobId'), status: { in: ['DEAD', 'READY'] } }, data: expect.objectContaining({ replayCount: { increment: 1 }, attempts: 0, status: 'READY' }) }));
	expect(h.schedule).toHaveBeenCalledOnce();
});
