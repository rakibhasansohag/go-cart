import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationStatus, MessageSenderRole, Role } from '@prisma/client';

const {
	currentUserMock,
	findUniqueStoreMock,
	findUniqueUserMock,
	findUniqueConversationMock,
	findManyConversationMock,
	countConversationMock,
	createConversationMock,
	updateConversationMock,
	createMessageMock,
	publishDomainEventMock,
	transactionMock,
} = vi.hoisted(() => {
	const currentUserMock = vi.fn();
	const findUniqueStoreMock = vi.fn();
	const findUniqueUserMock = vi.fn();
	const findUniqueConversationMock = vi.fn();
	const findManyConversationMock = vi.fn();
	const countConversationMock = vi.fn();
	const createConversationMock = vi.fn();
	const updateConversationMock = vi.fn();
	const createMessageMock = vi.fn();
	const publishDomainEventMock = vi.fn();
	const transactionMock = vi.fn((cb: (tx: unknown) => unknown) =>
		cb({
			conversation: {
				create: createConversationMock,
				update: updateConversationMock,
			},
			message: {
				create: createMessageMock,
			},
		})
	);

	return {
		currentUserMock,
		findUniqueStoreMock,
		findUniqueUserMock,
		findUniqueConversationMock,
		findManyConversationMock,
		countConversationMock,
		createConversationMock,
		updateConversationMock,
		createMessageMock,
		publishDomainEventMock,
		transactionMock,
	};
});

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: currentUserMock,
}));

vi.mock('@/lib/db', () => ({
	db: {
		store: {
			findUnique: findUniqueStoreMock,
		},
		user: {
			findUnique: findUniqueUserMock,
		},
		conversation: {
			findUnique: findUniqueConversationMock,
			findMany: findManyConversationMock,
			count: countConversationMock,
			create: createConversationMock,
			update: updateConversationMock,
		},
		message: {
			create: createMessageMock,
		},
		$transaction: transactionMock,
	},
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {
		INQUIRY_BUYER_SENT: 'inquiry.buyer_sent',
		INQUIRY_SELLER_REPLIED: 'inquiry.seller_replied',
	},
	publishDomainEvent: publishDomainEventMock,
}));

import {
	getBuyerConversations,
	getSellerConversations,
	getConversationDetails,
	startConversation,
	sendReplyMessage,
	updateConversationStatus,
} from './messages';

describe('queries/messages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getBuyerConversations', () => {
		it('returns empty response when not signed in', async () => {
			currentUserMock.mockResolvedValue(null);

			const result = await getBuyerConversations();
			expect(result.conversations).toEqual([]);
			expect(result.total).toBe(0);
		});

		it('returns user conversations and badge counts', async () => {
			currentUserMock.mockResolvedValue({ id: 'buyer-1' });
			countConversationMock
				.mockResolvedValueOnce(2) // all
				.mockResolvedValueOnce(1) // open
				.mockResolvedValueOnce(1); // resolved

			findManyConversationMock.mockResolvedValue([
				{
					id: 'c-1',
					storeId: 'store-1',
					userId: 'buyer-1',
					subject: 'Shipping question',
					status: ConversationStatus.OPEN,
					productId: 'p-1',
					orderId: null,
					unreadBySeller: 0,
					unreadByBuyer: 1,
					lastMessageAt: new Date('2026-09-04T12:00:00Z'),
					updatedAt: new Date('2026-09-04T12:00:00Z'),
					store: { id: 'store-1', name: 'Tech Store', url: 'tech-store', logo: '' },
					user: { id: 'buyer-1', name: 'Buyer', email: 'b@test.com', picture: '' },
					product: { id: 'p-1', name: 'Watch', slug: 'watch', variants: [] },
					messages: [{ body: 'When does it ship?', createdAt: new Date() }],
				},
			]);

			const result = await getBuyerConversations();
			expect(result.total).toBe(1);
			expect(result.counts.unread).toBe(1);
			expect(result.conversations[0].subject).toBe('Shipping question');
			expect(result.conversations[0].store.name).toBe('Tech Store');
		});
	});

	describe('getSellerConversations', () => {
		it('rejects user who is not store owner or admin', async () => {
			currentUserMock.mockResolvedValue({ id: 'random-user' });
			findUniqueStoreMock.mockResolvedValue({ id: 'store-1', userId: 'owner-1' });
			findUniqueUserMock.mockResolvedValue({ role: Role.USER });

			const result = await getSellerConversations('tech-store');
			expect(result.conversations).toEqual([]);
			expect(result.total).toBe(0);
		});

		it('returns conversations for store owner', async () => {
			currentUserMock.mockResolvedValue({ id: 'owner-1' });
			findUniqueStoreMock.mockResolvedValue({ id: 'store-1', userId: 'owner-1' });
			findUniqueUserMock.mockResolvedValue({ role: Role.SELLER });
			countConversationMock
				.mockResolvedValueOnce(3) // all
				.mockResolvedValueOnce(2) // open
				.mockResolvedValueOnce(1) // unread
				.mockResolvedValueOnce(1); // resolved

			findManyConversationMock.mockResolvedValue([
				{
					id: 'c-1',
					storeId: 'store-1',
					userId: 'buyer-1',
					subject: 'Watch inquiry',
					status: ConversationStatus.OPEN,
					productId: null,
					orderId: null,
					unreadBySeller: 1,
					unreadByBuyer: 0,
					lastMessageAt: new Date('2026-09-04T12:00:00Z'),
					updatedAt: new Date('2026-09-04T12:00:00Z'),
					store: { id: 'store-1', name: 'Tech Store', url: 'tech-store', logo: '' },
					user: { id: 'buyer-1', name: 'Alice', email: 'alice@test.com', picture: '' },
					product: null,
					messages: [{ body: 'Is this water resistant?', createdAt: new Date() }],
				},
			]);

			const result = await getSellerConversations('tech-store');
			expect(result.total).toBe(1);
			expect(result.counts.all).toBe(3);
			expect(result.conversations[0].user.name).toBe('Alice');
		});
	});

	describe('getConversationDetails', () => {
		it('rejects unauthorized third party user', async () => {
			currentUserMock.mockResolvedValue({ id: 'third-party-user' });
			findUniqueConversationMock.mockResolvedValue({
				id: 'c-1',
				userId: 'buyer-1',
				store: { userId: 'seller-1' },
			});
			findUniqueUserMock.mockResolvedValue({ role: Role.USER });

			const result = await getConversationDetails('c-1');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Unauthorized');
		});

		it('resets unreadByBuyer when buyer views conversation', async () => {
			currentUserMock.mockResolvedValue({ id: 'buyer-1' });
			findUniqueConversationMock.mockResolvedValue({
				id: 'c-1',
				storeId: 'store-1',
				userId: 'buyer-1',
				subject: 'Order question',
				status: ConversationStatus.OPEN,
				productId: null,
				orderId: null,
				unreadBySeller: 0,
				unreadByBuyer: 2,
				lastMessageAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				store: { id: 'store-1', name: 'Tech', url: 'tech', logo: '', userId: 'seller-1' },
				user: { id: 'buyer-1', name: 'Buyer', email: 'b@test.com', picture: '' },
				product: null,
				order: null,
				messages: [
					{
						id: 'm-1',
						conversationId: 'c-1',
						senderId: 'seller-1',
						senderRole: MessageSenderRole.SELLER,
						body: 'Yes we can help!',
						isRead: true,
						createdAt: new Date(),
						sender: { id: 'seller-1', name: 'Tech', picture: '' },
					},
				],
			});
			findUniqueUserMock.mockResolvedValue({ role: Role.USER });
			updateConversationMock.mockResolvedValue({});

			const result = await getConversationDetails('c-1');
			expect(result.success).toBe(true);
			expect(updateConversationMock).toHaveBeenCalledWith({
				where: { id: 'c-1' },
				data: { unreadByBuyer: 0 },
			});
		});
	});

	describe('startConversation', () => {
		it('prevents seller from messaging their own store', async () => {
			currentUserMock.mockResolvedValue({ id: 'seller-1' });
			findUniqueStoreMock.mockResolvedValue({
				id: 'store-1',
				userId: 'seller-1',
				name: 'Own Store',
			});

			const result = await startConversation({
				storeId: 'store-1',
				message: 'Test message to myself',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('own store');
		});

		it('creates conversation and dispatches inquiry.buyer_sent domain event', async () => {
			currentUserMock.mockResolvedValue({
				id: 'buyer-1',
				firstName: 'John',
				lastName: 'Doe',
			});
			findUniqueStoreMock.mockResolvedValue({
				id: 'store-1',
				userId: 'seller-1',
				name: 'Gadget Shop',
			});

			createConversationMock.mockResolvedValue({
				id: 'new-c-id',
				messages: [{ id: 'new-m-id' }],
			});

			const result = await startConversation({
				storeId: 'store-1',
				subject: 'Compatibility query',
				message: 'Does this fit an iPhone 16?',
				productId: 'prod-1',
			});

			expect(result.success).toBe(true);
			expect(result.conversationId).toBe('new-c-id');
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'inquiry.buyer_sent',
					aggregateId: 'new-c-id',
				})
			);
		});
	});

	describe('sendReplyMessage', () => {
		it('allows seller to reply and dispatches inquiry.seller_replied event', async () => {
			currentUserMock.mockResolvedValue({ id: 'seller-1' });
			findUniqueConversationMock.mockResolvedValue({
				id: 'c-1',
				storeId: 'store-1',
				userId: 'buyer-1',
				subject: 'Compatibility query',
				store: { id: 'store-1', userId: 'seller-1', name: 'Gadget Shop' },
			});
			findUniqueUserMock.mockResolvedValue({
				role: Role.SELLER,
				name: 'Gadget Shop Rep',
				picture: '',
			});

			createMessageMock.mockResolvedValue({
				id: 'm-reply',
				conversationId: 'c-1',
				senderId: 'seller-1',
				senderRole: MessageSenderRole.SELLER,
				body: 'Yes, it is fully compatible!',
				isRead: false,
				createdAt: new Date(),
				sender: { id: 'seller-1', name: 'Gadget Shop Rep', picture: '' },
			});

			const result = await sendReplyMessage({
				conversationId: 'c-1',
				message: 'Yes, it is fully compatible!',
			});

			expect(result.success).toBe(true);
			expect(result.message?.senderRole).toBe(MessageSenderRole.SELLER);
			expect(updateConversationMock).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						unreadByBuyer: { increment: 1 },
						status: ConversationStatus.OPEN,
					}),
				})
			);
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'inquiry.seller_replied',
				})
			);
		});
	});

	describe('updateConversationStatus', () => {
		it('allows buyer to resolve their conversation', async () => {
			currentUserMock.mockResolvedValue({ id: 'buyer-1' });
			findUniqueConversationMock.mockResolvedValue({
				id: 'c-1',
				userId: 'buyer-1',
				store: { userId: 'seller-1' },
			});
			findUniqueUserMock.mockResolvedValue({ role: Role.USER });

			const result = await updateConversationStatus('c-1', ConversationStatus.RESOLVED);
			expect(result.success).toBe(true);
			expect(updateConversationMock).toHaveBeenCalledWith({
				where: { id: 'c-1' },
				data: { status: ConversationStatus.RESOLVED },
			});
		});
	});
});
