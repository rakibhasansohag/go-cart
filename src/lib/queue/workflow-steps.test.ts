import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ carts: vi.fn(), groups: vi.fn(), returns: vi.fn(), enqueue: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { cart: { findMany: h.carts }, orderGroup: { findMany: h.groups }, returnRequest: { findMany: h.returns } } }));
vi.mock('./jobs', () => ({ enqueueBackgroundJob: h.enqueue }));
vi.mock('server-only', () => ({}));
import { recoverWorkflowSteps } from './workflow-steps';

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubEnv('PHASE26_ENABLED', 'true');
	vi.stubEnv('ABANDONED_CHECKOUT_EMAIL_ENABLED', 'true');
	h.carts.mockResolvedValue([]); h.groups.mockResolvedValue([]); h.returns.mockResolvedValue([]);
	h.enqueue.mockResolvedValue({ id: 'job' });
});
afterEach(() => vi.unstubAllEnvs());

it('recovers carts, fulfillment and returns beyond the first page without repeated rows', async () => {
	const due = new Date('2026-10-01T00:00:00Z');
	const rows = Array.from({ length: 101 }, (_, i) => ({ id: `row-${String(i).padStart(3, '0')}`, updatedAt: due, nextTransitionAt: due, respondBy: due }));
	for (const read of [h.carts, h.groups, h.returns]) read.mockResolvedValueOnce(rows.slice(0, 100)).mockResolvedValueOnce(rows.slice(100));
	await expect(recoverWorkflowSteps()).resolves.toEqual({ carts: 101, groups: 101, returns: 101 });
	for (const read of [h.carts, h.groups, h.returns]) {
		expect(read).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ id: { gt: 'row-099' } }), take: 100, orderBy: { id: 'asc' } }));
	}
	const keys = h.enqueue.mock.calls.map(call => (call[1] as { eventKey: string }).eventKey);
	expect(keys).toHaveLength(303);
	expect(new Set(keys).size).toBe(303);
});

it('does not scan carts while reminders are disabled', async () => {
	vi.stubEnv('ABANDONED_CHECKOUT_EMAIL_ENABLED', 'false');
	await recoverWorkflowSteps(); expect(h.carts).not.toHaveBeenCalled();
});

it('does not scan or enqueue work while the phase is disabled', async () => {
	vi.stubEnv('PHASE26_ENABLED', 'false');
	await expect(recoverWorkflowSteps()).resolves.toEqual({ carts: 0, groups: 0, returns: 0 });
	expect(h.groups).not.toHaveBeenCalled(); expect(h.returns).not.toHaveBeenCalled(); expect(h.enqueue).not.toHaveBeenCalled();
});
