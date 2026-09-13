import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RequestGuardError, requireAuthenticatedUser } from '@/lib/security/request-guards';
import { RealtimeSyncResult } from '@/lib/realtime/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
	try {
		const user = await requireAuthenticatedUser();
		const { searchParams } = new URL(req.url);

		const lastCheckedAt = searchParams.get('lastCheckedAt');
		const conversationId = searchParams.get('conversationId');
		const storeUrl = searchParams.get('storeUrl');

		const lastDate = lastCheckedAt ? new Date(lastCheckedAt) : null;
		const isValidDate = Boolean(lastDate && !isNaN(lastDate.getTime()));

		let hasNewMessages = false;
		let newMessagesCount = 0;
		let hasConversationUpdates = false;

		// 1. Check if active conversation has any new messages since cursor
		if (conversationId && isValidDate && lastDate) {
			const count = await db.message.count({
				where: {
					conversationId,
					createdAt: { gt: lastDate },
				},
			});
			if (count > 0) {
				hasNewMessages = true;
				newMessagesCount = count;
			}
		}

		// 2. Check if conversation list has updates since cursor
		if (isValidDate && lastDate) {
			if (storeUrl) {
				const store = await db.store.findUnique({
					where: { url: storeUrl },
					select: { id: true, userId: true },
				});
				if (store && store.userId === user.id) {
					const count = await db.conversation.count({
						where: {
							storeId: store.id,
							lastMessageAt: { gt: lastDate },
						},
					});
					hasConversationUpdates = count > 0;
				}
			} else {
				const count = await db.conversation.count({
					where: {
						userId: user.id,
						lastMessageAt: { gt: lastDate },
					},
				});
				hasConversationUpdates = count > 0;
			}
		}

		// 3. Lightweight unread notifications count for badge sync
		const unreadNotificationsCount = await db.notification.count({
			where: {
				recipientId: user.id,
				readAt: null,
			},
		});

		const result: RealtimeSyncResult = {
			hasNewMessages,
			newMessagesCount,
			hasConversationUpdates,
			unreadNotificationsCount,
			serverTime: new Date().toISOString(),
		};

		return NextResponse.json(result, {
			headers: {
				'Cache-Control': 'private, no-cache, no-store, must-revalidate',
			},
		});
	} catch (error) {
		if (error instanceof RequestGuardError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		return NextResponse.json(
			{ error: 'Failed to process sync.' },
			{ status: 500 }
		);
	}
}
