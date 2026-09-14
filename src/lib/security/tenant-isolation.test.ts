import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertReturnActorAccess } from '@/lib/returns/domain';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	auth: vi.fn(),
	db: {
		user: { findUnique: vi.fn() },
		store: { findUnique: vi.fn() },
		conversation: { findUnique: vi.fn() },
		sellerSettlement: { findUnique: vi.fn() },
	},
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: harness.currentUser,
	auth: harness.auth,
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

vi.mock('@/lib/security/rate-limit', () => ({
	enforceSharedRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { getConversationDetails, sendReplyMessage } from '@/queries/messages';
import { processSellerDisbursement } from '@/queries/disbursement';

describe('Cross-Tenant Data Isolation & RBAC', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Messaging Boundary Isolation', () => {
		it('prevents Buyer A from reading Buyer B conversation with Store X', async () => {
			harness.currentUser.mockResolvedValue({ id: 'buyer-attacker' });
			harness.db.user.findUnique.mockResolvedValue({ role: 'USER' });
			harness.db.conversation.findUnique.mockResolvedValue({
				id: 'conv-victim',
				userId: 'buyer-victim',
				storeId: 'store-1',
				store: { id: 'store-1', userId: 'seller-1' },
			});

			const result = await getConversationDetails('conv-victim');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Unauthorized to view this conversation');
		});

		it('prevents Seller B from reading Seller A conversation', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller-unauthorized' });
			harness.db.user.findUnique.mockResolvedValue({ role: 'SELLER' });
			harness.db.store.findUnique.mockResolvedValue({ id: 'store-2', userId: 'seller-unauthorized' });
			harness.db.conversation.findUnique.mockResolvedValue({
				id: 'conv-victim',
				userId: 'buyer-victim',
				storeId: 'store-1',
				store: { id: 'store-1', userId: 'seller-authorized' },
			});

			const result = await getConversationDetails('conv-victim');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Unauthorized to view this conversation');
		});

		it('prevents unauthorized user from posting replies to conversations they do not own', async () => {
			harness.currentUser.mockResolvedValue({ id: 'intruder' });
			harness.db.conversation.findUnique.mockResolvedValue({
				id: 'conv-target',
				userId: 'buyer-legitimate',
				store: { id: 'store-1', userId: 'seller-legitimate', name: 'Store 1' },
			});
			harness.db.user.findUnique.mockResolvedValue({
				id: 'intruder',
				role: 'USER',
			});

			const result = await sendReplyMessage({
				conversationId: 'conv-target',
				message: 'Malicious reply attempt',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('Unauthorized to reply in this conversation');
		});
	});

	describe('Return Request Multi-Tenant Boundary', () => {
		it('denies access if customer attempts to view another customer return', () => {
			expect(() =>
				assertReturnActorAccess({
					actorId: 'customer-attacker',
					actorRole: 'CUSTOMER',
					customerId: 'customer-victim',
					storeOwnerId: 'seller-1',
				}),
			).toThrow('You do not have access to this return request.');
		});

		it('denies access if seller attempts to view a return belonging to another store', () => {
			expect(() =>
				assertReturnActorAccess({
					actorId: 'seller-rival',
					actorRole: 'SELLER',
					customerId: 'customer-1',
					storeOwnerId: 'seller-owner',
				}),
			).toThrow('You do not have access to this store return.');
		});

		it('permits access when actor is the verified customer or store owner', () => {
			expect(() =>
				assertReturnActorAccess({
					actorId: 'customer-owner',
					actorRole: 'CUSTOMER',
					customerId: 'customer-owner',
					storeOwnerId: 'seller-1',
				}),
			).not.toThrow();

			expect(() =>
				assertReturnActorAccess({
					actorId: 'seller-owner',
					actorRole: 'SELLER',
					customerId: 'customer-1',
					storeOwnerId: 'seller-owner',
				}),
			).not.toThrow();
		});
	});

	describe('Disbursement & Financial Settlement RBAC', () => {
		it('strictly prevents non-admin seller from triggering disbursements', async () => {
			harness.auth.mockResolvedValue({ userId: 'seller-user' });
			harness.db.user.findUnique.mockResolvedValue({
				id: 'seller-user',
				role: 'SELLER',
			});

			await expect(
				processSellerDisbursement({ settlementId: 'settle-1' }),
			).rejects.toThrow('Unauthorized Access: Admin privileges required.');
		});

		it('strictly prevents unauthenticated caller from triggering disbursements', async () => {
			harness.auth.mockResolvedValue({ userId: null });

			await expect(
				processSellerDisbursement({ settlementId: 'settle-1' }),
			).rejects.toThrow('Unauthenticated.');
		});
	});
});
