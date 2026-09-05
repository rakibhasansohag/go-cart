'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import {
	ConversationStatus,
	MessageSenderRole,
	Role,
	Prisma,
} from '@prisma/client';
import { z } from 'zod';
import {
	publishDomainEvent,
	DOMAIN_EVENT_TYPES,
} from '@/lib/notifications/domain-events';

// Internal Zod Schemas (not exported to satisfy Next.js "use server" action requirements)
const StartConversationSchema = z.object({
	storeId: z.string().min(1, 'Store ID is required.'),
	subject: z.string().trim().max(120).optional(),
	message: z
		.string()
		.trim()
		.min(2, 'Message must be at least 2 characters.')
		.max(2000, 'Message cannot exceed 2000 characters.'),
	productId: z.string().optional(),
	orderId: z.string().optional(),
	orderGroupId: z.string().optional(),
});

const SendReplySchema = z.object({
	conversationId: z.string().min(1, 'Conversation ID is required.'),
	message: z
		.string()
		.trim()
		.min(1, 'Message cannot be empty.')
		.max(2000, 'Message cannot exceed 2000 characters.'),
});

export type StartConversationInput = z.infer<typeof StartConversationSchema>;
export type SendReplyMessageInput = z.infer<typeof SendReplySchema>;

export interface MessageItem {
	id: string;
	conversationId: string;
	senderId: string;
	senderRole: MessageSenderRole;
	body: string;
	isRead: boolean;
	createdAt: string;
	sender: {
		id: string;
		name: string;
		picture: string;
	};
}

export interface ConversationDetail {
	id: string;
	storeId: string;
	store: {
		id: string;
		name: string;
		url: string;
		logo: string;
	};
	userId: string;
	user: {
		id: string;
		name: string;
		email: string;
		picture: string;
	};
	subject: string | null;
	status: ConversationStatus;
	productId: string | null;
	product: {
		id: string;
		name: string;
		slug: string;
		image: string;
		price?: number | null;
	} | null;
	orderId: string | null;
	order: {
		id: string;
		total: number;
		orderStatus: string;
		createdAt: string;
	} | null;
	unreadBySeller: number;
	unreadByBuyer: number;
	lastMessageAt: string;
	createdAt: string;
	updatedAt: string;
	messages: MessageItem[];
}

export interface ConversationListItem {
	id: string;
	storeId: string;
	store: {
		id: string;
		name: string;
		url: string;
		logo: string;
	};
	userId: string;
	user: {
		id: string;
		name: string;
		email: string;
		picture: string;
	};
	subject: string | null;
	status: ConversationStatus;
	productId: string | null;
	productName: string | null;
	productSlug: string | null;
	productImage: string | null;
	orderId: string | null;
	unreadCount: number;
	lastMessageSnippet: string;
	lastMessageAt: string;
	updatedAt: string;
}

export interface ConversationListResponse {
	conversations: ConversationListItem[];
	total: number;
	counts: {
		all: number;
		open: number;
		unread: number;
		resolved: number;
	};
}

/**
 * Fetch conversations for the authenticated buyer/customer.
 */
export async function getBuyerConversations(options?: {
	filter?: 'all' | 'open' | 'resolved';
	search?: string;
}): Promise<ConversationListResponse> {
	const user = await currentUser();
	if (!user) {
		return {
			conversations: [],
			total: 0,
			counts: { all: 0, open: 0, unread: 0, resolved: 0 },
		};
	}

	const filter = options?.filter ?? 'all';
	const search = options?.search?.trim() ?? '';

	const baseWhere: Prisma.ConversationWhereInput = {
		userId: user.id,
	};

	const where: Prisma.ConversationWhereInput = {
		...baseWhere,
		...(filter === 'open' ? { status: ConversationStatus.OPEN } : {}),
		...(filter === 'resolved' ? { status: ConversationStatus.RESOLVED } : {}),
		...(search
			? {
				OR: [
					{ subject: { contains: search, mode: 'insensitive' } },
					{ store: { name: { contains: search, mode: 'insensitive' } } },
					{ product: { name: { contains: search, mode: 'insensitive' } } },
					{ messages: { some: { body: { contains: search, mode: 'insensitive' } } } },
				],
			}
			: {}),
	};

	const [allCount, openCount, resolvedCount, rows] = await Promise.all([
		db.conversation.count({ where: baseWhere }),
		db.conversation.count({
			where: { ...baseWhere, status: ConversationStatus.OPEN },
		}),
		db.conversation.count({
			where: { ...baseWhere, status: ConversationStatus.RESOLVED },
		}),
		db.conversation.findMany({
			where,
			orderBy: { lastMessageAt: 'desc' },
			include: {
				store: {
					select: {
						id: true,
						name: true,
						url: true,
						logo: true,
					},
				},
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						picture: true,
					},
				},
				product: {
					select: {
						id: true,
						name: true,
						slug: true,
						variants: {
							take: 1,
							include: {
								images: { take: 1, orderBy: { order: 'asc' } },
							},
						},
					},
				},
				messages: {
					take: 1,
					orderBy: { createdAt: 'desc' },
					select: {
						body: true,
						createdAt: true,
					},
				},
			},
		}),
	]);

	const unreadCount = rows.reduce(
		(sum, conv) => sum + (conv.unreadByBuyer > 0 ? 1 : 0),
		0
	);

	const conversations: ConversationListItem[] = rows.map((conv) => {
		const firstVariantImg = conv.product?.variants[0]?.images[0]?.url || '';
		return {
			id: conv.id,
			storeId: conv.storeId,
			store: conv.store,
			userId: conv.userId,
			user: conv.user,
			subject: conv.subject,
			status: conv.status,
			productId: conv.productId,
			productName: conv.product?.name ?? null,
			productSlug: conv.product?.slug ?? null,
			productImage: firstVariantImg || null,
			orderId: conv.orderId,
			unreadCount: conv.unreadByBuyer,
			lastMessageSnippet: conv.messages[0]?.body ?? '',
			lastMessageAt: conv.lastMessageAt.toISOString(),
			updatedAt: conv.updatedAt.toISOString(),
		};
	});

	return {
		conversations,
		total: conversations.length,
		counts: {
			all: allCount,
			open: openCount,
			unread: unreadCount,
			resolved: resolvedCount,
		},
	};
}

/**
 * Fetch conversations for a specific store in the Seller Dashboard.
 */
export async function getSellerConversations(
	storeUrl: string,
	options?: {
		filter?: 'all' | 'unread' | 'open' | 'resolved';
		search?: string;
	}
): Promise<ConversationListResponse> {
	const user = await currentUser();
	if (!user) {
		return {
			conversations: [],
			total: 0,
			counts: { all: 0, open: 0, unread: 0, resolved: 0 },
		};
	}

	const store = await db.store.findUnique({
		where: { url: storeUrl },
		select: { id: true, userId: true },
	});
	if (!store) {
		return {
			conversations: [],
			total: 0,
			counts: { all: 0, open: 0, unread: 0, resolved: 0 },
		};
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});
	const isAdmin = dbUser?.role === Role.ADMIN;
	const isOwner = store.userId === user.id;

	if (!isOwner && !isAdmin) {
		return {
			conversations: [],
			total: 0,
			counts: { all: 0, open: 0, unread: 0, resolved: 0 },
		};
	}

	const filter = options?.filter ?? 'all';
	const search = options?.search?.trim() ?? '';

	const baseWhere: Prisma.ConversationWhereInput = {
		storeId: store.id,
	};

	const where: Prisma.ConversationWhereInput = {
		...baseWhere,
		...(filter === 'unread' ? { unreadBySeller: { gt: 0 } } : {}),
		...(filter === 'open' ? { status: ConversationStatus.OPEN } : {}),
		...(filter === 'resolved' ? { status: ConversationStatus.RESOLVED } : {}),
		...(search
			? {
				OR: [
					{ subject: { contains: search, mode: 'insensitive' } },
					{ user: { name: { contains: search, mode: 'insensitive' } } },
					{ user: { email: { contains: search, mode: 'insensitive' } } },
					{ product: { name: { contains: search, mode: 'insensitive' } } },
					{ messages: { some: { body: { contains: search, mode: 'insensitive' } } } },
				],
			}
			: {}),
	};

	const [allCount, openCount, unreadCount, resolvedCount, rows] =
		await Promise.all([
			db.conversation.count({ where: baseWhere }),
			db.conversation.count({
				where: { ...baseWhere, status: ConversationStatus.OPEN },
			}),
			db.conversation.count({
				where: { ...baseWhere, unreadBySeller: { gt: 0 } },
			}),
			db.conversation.count({
				where: { ...baseWhere, status: ConversationStatus.RESOLVED },
			}),
			db.conversation.findMany({
				where,
				orderBy: { lastMessageAt: 'desc' },
				include: {
					store: {
						select: {
							id: true,
							name: true,
							url: true,
							logo: true,
						},
					},
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							picture: true,
						},
					},
					product: {
						select: {
							id: true,
							name: true,
							slug: true,
							variants: {
								take: 1,
								include: {
									images: { take: 1, orderBy: { order: 'asc' } },
								},
							},
						},
					},
					messages: {
						take: 1,
						orderBy: { createdAt: 'desc' },
						select: {
							body: true,
							createdAt: true,
						},
					},
				},
			}),
		]);

	const conversations: ConversationListItem[] = rows.map((conv) => {
		const firstVariantImg = conv.product?.variants[0]?.images[0]?.url || '';
		return {
			id: conv.id,
			storeId: conv.storeId,
			store: conv.store,
			userId: conv.userId,
			user: conv.user,
			subject: conv.subject,
			status: conv.status,
			productId: conv.productId,
			productName: conv.product?.name ?? null,
			productSlug: conv.product?.slug ?? null,
			productImage: firstVariantImg || null,
			orderId: conv.orderId,
			unreadCount: conv.unreadBySeller,
			lastMessageSnippet: conv.messages[0]?.body ?? '',
			lastMessageAt: conv.lastMessageAt.toISOString(),
			updatedAt: conv.updatedAt.toISOString(),
		};
	});

	return {
		conversations,
		total: conversations.length,
		counts: {
			all: allCount,
			open: openCount,
			unread: unreadCount,
			resolved: resolvedCount,
		},
	};
}

/**
 * Fetch full conversation details and thread messages.
 * Automatically marks unread messages as read for the calling party.
 */
export async function getConversationDetails(
	conversationId: string
): Promise<{ success: boolean; conversation?: ConversationDetail; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Sign in required.' };
	}

	const conv = await db.conversation.findUnique({
		where: { id: conversationId },
		include: {
			store: {
				select: {
					id: true,
					name: true,
					url: true,
					logo: true,
					userId: true,
				},
			},
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					picture: true,
				},
			},
			product: {
				select: {
					id: true,
					name: true,
					slug: true,
					variants: {
						take: 1,
						include: {
							images: { take: 1, orderBy: { order: 'asc' } },
							sizes: { take: 1, orderBy: { price: 'asc' }, select: { price: true } },
						},
					},
				},
			},
			order: {
				select: {
					id: true,
					total: true,
					orderStatus: true,
					createdAt: true,
				},
			},
			messages: {
				orderBy: { createdAt: 'asc' },
				include: {
					sender: {
						select: {
							id: true,
							name: true,
							picture: true,
						},
					},
				},
			},
		},
	});

	if (!conv) {
		return { success: false, error: 'Conversation not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});
	const isAdmin = dbUser?.role === Role.ADMIN;
	const isBuyer = conv.userId === user.id;
	const isSeller = conv.store.userId === user.id;

	if (!isBuyer && !isSeller && !isAdmin) {
		return { success: false, error: 'Unauthorized to view this conversation.' };
	}

	// Reset unread count for the active reader
	if (isBuyer && conv.unreadByBuyer > 0) {
		await db.conversation.update({
			where: { id: conversationId },
			data: { unreadByBuyer: 0 },
		});
	} else if ((isSeller || isAdmin) && conv.unreadBySeller > 0) {
		await db.conversation.update({
			where: { id: conversationId },
			data: { unreadBySeller: 0 },
		});
	}

	const firstVariantImg = conv.product?.variants[0]?.images[0]?.url || '';

	return {
		success: true,
		conversation: {
			id: conv.id,
			storeId: conv.storeId,
			store: {
				id: conv.store.id,
				name: conv.store.name,
				url: conv.store.url,
				logo: conv.store.logo,
			},
			userId: conv.userId,
			user: conv.user,
			subject: conv.subject,
			status: conv.status,
			productId: conv.productId,
			product: conv.product
				? {
					id: conv.product.id,
					name: conv.product.name,
					slug: conv.product.slug,
					image: firstVariantImg,
					price: conv.product.variants[0]?.sizes[0]?.price ?? null,
				}
				: null,
			orderId: conv.orderId,
			order: conv.order
				? {
					id: conv.order.id,
					total: conv.order.total,
					orderStatus: conv.order.orderStatus,
					createdAt: conv.order.createdAt.toISOString(),
				}
				: null,
			unreadBySeller: isSeller || isAdmin ? 0 : conv.unreadBySeller,
			unreadByBuyer: isBuyer ? 0 : conv.unreadByBuyer,
			lastMessageAt: conv.lastMessageAt.toISOString(),
			createdAt: conv.createdAt.toISOString(),
			updatedAt: conv.updatedAt.toISOString(),
			messages: conv.messages.map((m) => ({
				id: m.id,
				conversationId: m.conversationId,
				senderId: m.senderId,
				senderRole: m.senderRole,
				body: m.body,
				isRead: m.isRead,
				createdAt: m.createdAt.toISOString(),
				sender: m.sender,
			})),
		},
	};
}

/**
 * Start a new conversation thread initiated by a customer.
 */
export async function startConversation(input: StartConversationInput): Promise<{
	success: boolean;
	conversationId?: string;
	error?: string;
}> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Please sign in to send an inquiry.' };
	}

	const parsed = StartConversationSchema.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || 'Invalid input data.',
		};
	}

	const { storeId, subject, message, productId, orderId, orderGroupId } =
		parsed.data;

	const store = await db.store.findUnique({
		where: { id: storeId },
		select: { id: true, userId: true, name: true },
	});
	if (!store) {
		return { success: false, error: 'Store does not exist.' };
	}

	if (store.userId === user.id) {
		return {
			success: false,
			error: 'You cannot send an inquiry to your own store.',
		};
	}

	const conversation = await db.conversation.create({
		data: {
			storeId,
			userId: user.id,
			subject: subject || null,
			productId: productId || null,
			orderId: orderId || null,
			orderGroupId: orderGroupId || null,
			unreadBySeller: 1,
			unreadByBuyer: 0,
			lastMessageAt: new Date(),
			messages: {
				create: {
					senderId: user.id,
					senderRole: MessageSenderRole.BUYER,
					body: message,
					isRead: false,
				},
			},
		},
		include: {
			messages: {
				take: 1,
				orderBy: { createdAt: 'desc' },
			},
		},
	});

	const firstMsg = conversation.messages[0];
	if (firstMsg) {
		try {
			await publishDomainEvent(db, {
				eventKey: `inquiry:sent:${firstMsg.id}`,
				eventType: DOMAIN_EVENT_TYPES.INQUIRY_BUYER_SENT,
				aggregateType: 'CONVERSATION',
				aggregateId: conversation.id,
				actorUserId: user.id,
				storeId,
				orderId: orderId || undefined,
				payload: {
					conversationId: conversation.id,
					messageId: firstMsg.id,
					storeId,
					buyerName: user.firstName
						? `${user.firstName} ${user.lastName || ''}`.trim()
						: 'Customer',
					subject: subject || undefined,
					bodySnippet: message.slice(0, 150),
				},
			});
		} catch (eventErr) {
			console.error('Failed to publish inquiry notification event:', eventErr);
		}
	}

	return { success: true, conversationId: conversation.id };
}

/**
 * Send a reply message in an existing conversation thread.
 */
export async function sendReplyMessage(input: SendReplyMessageInput): Promise<{
	success: boolean;
	message?: MessageItem;
	error?: string;
}> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Sign in required.' };
	}

	const parsed = SendReplySchema.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || 'Invalid reply message.',
		};
	}

	const { conversationId, message: body } = parsed.data;

	const conv = await db.conversation.findUnique({
		where: { id: conversationId },
		include: {
			store: {
				select: { id: true, userId: true, name: true },
			},
		},
	});

	if (!conv) {
		return { success: false, error: 'Conversation not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true, name: true, picture: true },
	});
	const isAdmin = dbUser?.role === Role.ADMIN;
	const isBuyer = conv.userId === user.id;
	const isSeller = conv.store.userId === user.id;

	if (!isBuyer && !isSeller && !isAdmin) {
		return { success: false, error: 'Unauthorized to reply in this conversation.' };
	}

	const senderRole: MessageSenderRole = isBuyer
		? MessageSenderRole.BUYER
		: isAdmin && !isSeller
			? MessageSenderRole.ADMIN
			: MessageSenderRole.SELLER;

	const createdMsg = await db.message.create({
		data: {
			conversationId,
			senderId: user.id,
			senderRole,
			body,
			isRead: false,
		},
		include: {
			sender: {
				select: { id: true, name: true, picture: true },
			},
		},
	});

	const updateData: Prisma.ConversationUpdateInput = {
		lastMessageAt: new Date(),
		status: ConversationStatus.OPEN, // auto-reopen thread on reply
		...(isBuyer
			? { unreadBySeller: { increment: 1 } }
			: { unreadByBuyer: { increment: 1 } }),
	};

	await db.conversation.update({
		where: { id: conversationId },
		data: updateData,
	});

	// Dispatch domain event notification outside transaction
	try {
		if (isBuyer) {
			await publishDomainEvent(db, {
				eventKey: `inquiry:msg:${createdMsg.id}`,
				eventType: DOMAIN_EVENT_TYPES.INQUIRY_BUYER_SENT,
				aggregateType: 'CONVERSATION',
				aggregateId: conv.id,
				actorUserId: user.id,
				storeId: conv.storeId,
				orderId: conv.orderId || undefined,
				payload: {
					conversationId: conv.id,
					messageId: createdMsg.id,
					storeId: conv.storeId,
					buyerName: dbUser?.name || 'Customer',
					subject: conv.subject || undefined,
					bodySnippet: body.slice(0, 150),
				},
			});
		} else {
			await publishDomainEvent(db, {
				eventKey: `inquiry:msg:${createdMsg.id}`,
				eventType: DOMAIN_EVENT_TYPES.INQUIRY_SELLER_REPLIED,
				aggregateType: 'CONVERSATION',
				aggregateId: conv.id,
				actorUserId: user.id,
				storeId: conv.storeId,
				orderId: conv.orderId || undefined,
				payload: {
					conversationId: conv.id,
					messageId: createdMsg.id,
					storeId: conv.storeId,
					storeName: conv.store.name,
					buyerId: conv.userId,
					bodySnippet: body.slice(0, 150),
				},
			});
		}
	} catch (eventErr) {
		console.error('Failed to publish reply notification event:', eventErr);
	}

	return {
		success: true,
		message: {
			id: createdMsg.id,
			conversationId: createdMsg.conversationId,
			senderId: createdMsg.senderId,
			senderRole: createdMsg.senderRole,
			body: createdMsg.body,
			isRead: createdMsg.isRead,
			createdAt: createdMsg.createdAt.toISOString(),
			sender: createdMsg.sender,
		},
	};
}

/**
 * Update conversation status (Resolve or Reopen).
 * Both the buyer and seller can mark threads as resolved or reopen them.
 */
export async function updateConversationStatus(
	conversationId: string,
	status: ConversationStatus
): Promise<{ success: boolean; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Sign in required.' };
	}

	const conv = await db.conversation.findUnique({
		where: { id: conversationId },
		include: {
			store: { select: { userId: true } },
		},
	});

	if (!conv) {
		return { success: false, error: 'Conversation not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});
	const isAdmin = dbUser?.role === Role.ADMIN;
	const isBuyer = conv.userId === user.id;
	const isSeller = conv.store.userId === user.id;

	if (!isBuyer && !isSeller && !isAdmin) {
		return { success: false, error: 'Unauthorized to modify this conversation.' };
	}

	await db.conversation.update({
		where: { id: conversationId },
		data: { status },
	});

	return { success: true };
}

export interface StoreCatalogItem {
	id: string;
	name: string;
	slug: string;
	image: string;
	price: number;
}

/**
 * Retrieve active store products for the seller in-chat recommendation picker.
 */
export async function getStoreCatalogForChat(
	storeUrl: string
): Promise<{ success: boolean; products: StoreCatalogItem[]; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, products: [], error: 'Sign in required.' };
	}

	const store = await db.store.findUnique({
		where: { url: storeUrl },
		select: { id: true, userId: true },
	});

	if (!store) {
		return { success: false, products: [], error: 'Store not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});
	const isOwner = store.userId === user.id;
	const isAdmin = dbUser?.role === Role.ADMIN;

	if (!isOwner && !isAdmin) {
		return { success: false, products: [], error: 'Unauthorized to view store catalog.' };
	}

	const products = await db.product.findMany({
		where: { storeId: store.id },
		take: 30,
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			name: true,
			slug: true,
			variants: {
				take: 1,
				include: {
					images: { take: 1, orderBy: { order: 'asc' } },
					sizes: { take: 1, orderBy: { price: 'asc' }, select: { price: true } },
				},
			},
		},
	});

	const items: StoreCatalogItem[] = products.map((p) => ({
		id: p.id,
		name: p.name,
		slug: p.slug,
		image: p.variants[0]?.images[0]?.url || '',
		price: p.variants[0]?.sizes[0]?.price || 0,
	}));

	return { success: true, products: items };
}
