import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: { store: { findUnique: vi.fn() }, product: { findFirst: vi.fn() }, order: { findFirst: vi.fn() }, orderGroup: { findFirst: vi.fn() }, user: { findUnique: vi.fn() }, conversation: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser }));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceSharedRateLimit: vi.fn() }));
vi.mock('@/lib/notifications/domain-events', () => ({ DOMAIN_EVENT_TYPES: {}, publishDomainEvent: vi.fn() }));
import { getConversationDetails, startConversation } from './messages';
describe('conversation reference integrity', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		h.currentUser.mockResolvedValue({ id: 'buyer' });
		h.db.store.findUnique.mockResolvedValue({ id: 'store', userId: 'seller' });
		h.db.product.findFirst.mockResolvedValue({ id: 'product' });
		h.db.order.findFirst.mockResolvedValue({ id: 'order' });
		h.db.orderGroup.findFirst.mockResolvedValue({ id: 'group' });
		h.db.conversation.create.mockResolvedValue({ id: 'conversation', messages: [] });
		h.db.user.findUnique.mockResolvedValue({ role: 'USER' });
	});
	it('rejects a foreign order before creating its disclosure link', async () => {
		h.db.order.findFirst.mockResolvedValue(null);
		await expect(startConversation({ storeId: 'store', message: 'Question about order', orderId: 'victim' })).resolves.toMatchObject({ success: false });
		expect(h.db.conversation.create).not.toHaveBeenCalled();
		expect(h.db.order.findFirst).toHaveBeenCalledWith({ where: { id: 'victim', userId: 'buyer', groups: { some: { storeId: 'store' } } }, select: { id: true } });
	});
	it('rejects a foreign or mismatched order group', async () => {
		h.db.orderGroup.findFirst.mockResolvedValue(null);
		await expect(startConversation({ storeId: 'store', message: 'Question about order', orderId: 'order', orderGroupId: 'victim-group' })).resolves.toMatchObject({ success: false });
		expect(h.db.conversation.create).not.toHaveBeenCalled();
	});
	it('rejects a product from another store', async () => {
		h.db.product.findFirst.mockResolvedValue(null);
		await expect(startConversation({ storeId: 'store', message: 'Product question', productId: 'foreign' })).resolves.toMatchObject({ success: false });
		expect(h.db.conversation.create).not.toHaveBeenCalled();
	});
	it.each([{ orderId: 'order', orderGroupId: 'group' }, { productId: 'product' }, {}])('preserves ordinary authorized inquiry %j', async (context) => {
		await expect(startConversation({ storeId: 'store', message: 'A legitimate inquiry', ...context })).resolves.toMatchObject({ success: true, conversationId: 'conversation' });
	});
	it('blocks historical forged order links even when attacker owns the conversation', async () => {
		h.db.conversation.findUnique.mockResolvedValue({ id: 'conversation', userId: 'buyer', storeId: 'store', store: { userId: 'seller' }, orderId: 'victim-order' });
		h.db.order.findFirst.mockResolvedValue(null);
		await expect(getConversationDetails('conversation')).resolves.toEqual({ success: false, error: 'Conversation contains an invalid order reference.' });
		expect(h.db.conversation.update).not.toHaveBeenCalled();
	});
});
