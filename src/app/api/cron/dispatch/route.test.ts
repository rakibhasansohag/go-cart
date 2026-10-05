import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ recover: vi.fn(), alert: vi.fn(), workflows: vi.fn(), enqueue: vi.fn(), relay: vi.fn(), schedule: vi.fn() }));
vi.mock('@/lib/queue/config', () => ({ queuesEnabled: () => true }));
vi.mock('@/lib/queue/worker', () => ({ recoverExpiredJobs: h.recover }));
vi.mock('@/lib/queue/alerts', () => ({ alertDeadJobs: h.alert }));
vi.mock('@/lib/queue/workflow-steps', () => ({ recoverWorkflowSteps: h.workflows }));
vi.mock('@/lib/queue/cron-jobs', () => ({ enqueueDailyCronJobs: h.enqueue }));
vi.mock('@/lib/queue/relay', () => ({ relayBackgroundJobs: h.relay }));
vi.mock('@/lib/queue/schedule', () => ({ scheduleBackgroundJobs: h.schedule }));
vi.mock('@/lib/email/outbox', () => ({ dispatchEmailOutboxBatch: vi.fn() }));
vi.mock('@/lib/cart/abandoned-checkout', () => ({ enqueueAbandonedCheckoutReminders: vi.fn() }));
vi.mock('@/lib/orders/demo-automation', () => ({ runDemoFulfillment: vi.fn() }));
vi.mock('@/lib/notifications/retention', () => ({ cleanupNotificationDeliveryData: vi.fn() }));
vi.mock('@/lib/settlement/payout-review', () => ({ createWeeklyPayoutReview: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/notifications/domain-events', () => ({ DOMAIN_EVENT_TYPES: {}, publishDomainEvent: vi.fn() }));
import { POST } from './route';

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubEnv('CRON_SECRET', 'test-cron-secret');
	vi.spyOn(console, 'error').mockImplementation(() => {});
	h.workflows.mockResolvedValue({ carts: 0, groups: 0, returns: 0 });
	h.enqueue.mockResolvedValue([{ id: 'cron-1' }, { id: 'cron-2' }]);
	h.relay.mockResolvedValue({ published: 2, failed: 0, disabled: false });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const request = () => new Request('https://example.test/api/cron/dispatch', { method: 'POST', headers: { authorization: 'Bearer test-cron-secret' } });

it('rejects unauthorized dispatch before starting maintenance', async () => {
	const response = await POST(new Request('https://example.test/api/cron/dispatch', { method: 'POST' }));
	expect(response.status).toBe(401);
	for (const operation of Object.values(h)) expect(operation).not.toHaveBeenCalled();
});

it.each(['recover', 'alert', 'workflows'] as const)('continues enqueue and relay when %s fails without exposing the failure text', async operation => {
	h[operation].mockRejectedValue(new Error('private-provider-secret'));
	const response = await POST(request());
	const body = await response.json();
	expect(body).toMatchObject({ ok: false, accepted: 2, relay: { published: 2 }, mode: 'durable-queue' });
	expect(JSON.stringify(body)).not.toContain('private-provider-secret');
	for (const task of Object.values(h)) expect(task).toHaveBeenCalledOnce();
});

it('relays previously committed jobs even when daily enqueue fails', async () => {
	h.enqueue.mockRejectedValue(new Error('Database enqueue failed'));
	const response = await POST(request());
	expect(await response.json()).toMatchObject({ ok: false, accepted: 0, relay: { published: 2 }, jobs: { dailyJobs: { status: 'failed' } } });
	expect(h.relay).toHaveBeenCalledOnce();
	expect(h.schedule).toHaveBeenCalledOnce();
});

it('reports successful independent maintenance', async () => {
	const response = await POST(request());
	expect(await response.json()).toMatchObject({ ok: true, accepted: 2, mode: 'durable-queue' });
});

it('keeps the follow-up relay scheduled when immediate transport dispatch fails', async () => {
	h.relay.mockRejectedValue(new Error('Transport unavailable'));
	const response = await POST(request());
	expect(await response.json()).toMatchObject({ ok: false, accepted: 2, relay: null, jobs: { relay: { status: 'failed' } } });
	expect(h.schedule).toHaveBeenCalledOnce();
});
