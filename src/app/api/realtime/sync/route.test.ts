import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { guardMock, dbMock } = vi.hoisted(() => ({
	guardMock: vi.fn(),
	dbMock: {
		message: {
			count: vi.fn(),
		},
		conversation: {
			count: vi.fn(),
		},
		store: {
			findUnique: vi.fn(),
		},
		notification: {
			count: vi.fn(),
		},
	},
}));

vi.mock('@/lib/security/request-guards', () => ({
	RequestGuardError: class RequestGuardError extends Error {
		constructor(public readonly status: 401 | 403, message: string) {
			super(message);
		}
	},
	requireAuthenticatedUser: guardMock,
}));

vi.mock('@/lib/db', () => ({
	db: dbMock,
}));

import { GET } from './route';

describe('realtime sync API route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const { RequestGuardError } = await import('@/lib/security/request-guards');
		guardMock.mockRejectedValue(new RequestGuardError(401, 'Authentication is required.'));

		const response = await GET(new NextRequest('http://localhost/api/realtime/sync'));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Authentication is required.' });
	});

	it('returns default sync data when no parameters provided', async () => {
		guardMock.mockResolvedValue({ id: 'user-1', role: 'BUYER' });
		dbMock.notification.count.mockResolvedValue(3);

		const response = await GET(new NextRequest('http://localhost/api/realtime/sync'));

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json).toMatchObject({
			hasNewMessages: false,
			newMessagesCount: 0,
			hasConversationUpdates: false,
			unreadNotificationsCount: 3,
		});
		expect(typeof json.serverTime).toBe('string');
	});

	it('detects new messages when conversationId and lastCheckedAt are provided', async () => {
		guardMock.mockResolvedValue({ id: 'user-1', role: 'BUYER' });
		dbMock.message.count.mockResolvedValue(2);
		dbMock.conversation.count.mockResolvedValue(1);
		dbMock.notification.count.mockResolvedValue(0);

		const cursor = new Date(Date.now() - 5000).toISOString();
		const response = await GET(
			new NextRequest(`http://localhost/api/realtime/sync?conversationId=conv-123&lastCheckedAt=${encodeURIComponent(cursor)}`)
		);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.hasNewMessages).toBe(true);
		expect(json.newMessagesCount).toBe(2);
		expect(json.hasConversationUpdates).toBe(true);
		expect(dbMock.message.count).toHaveBeenCalledWith({
			where: {
				conversationId: 'conv-123',
				createdAt: { gt: expect.any(Date) },
			},
		});
	});

	it('detects conversation updates for seller store', async () => {
		guardMock.mockResolvedValue({ id: 'seller-user-1', role: 'SELLER' });
		dbMock.store.findUnique.mockResolvedValue({ id: 'store-1', userId: 'seller-user-1' });
		dbMock.conversation.count.mockResolvedValue(1);
		dbMock.notification.count.mockResolvedValue(1);

		const cursor = new Date(Date.now() - 5000).toISOString();
		const response = await GET(
			new NextRequest(`http://localhost/api/realtime/sync?storeUrl=my-store&lastCheckedAt=${encodeURIComponent(cursor)}`)
		);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.hasConversationUpdates).toBe(true);
		expect(dbMock.store.findUnique).toHaveBeenCalledWith({
			where: { url: 'my-store' },
			select: { id: true, userId: true },
		});
		expect(dbMock.conversation.count).toHaveBeenCalledWith({
			where: {
				storeId: 'store-1',
				lastMessageAt: { gt: expect.any(Date) },
			},
		});
	});

	it('returns 500 on unexpected database error', async () => {
		guardMock.mockResolvedValue({ id: 'user-1' });
		dbMock.notification.count.mockRejectedValue(new Error('DB unreachable'));

		const response = await GET(new NextRequest('http://localhost/api/realtime/sync'));

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'Failed to process sync.' });
	});
});
