'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { QAModerationStatus, Role } from '@prisma/client';
import { isVerifiedBuyer } from '@/lib/qa/verified-buyer';
import {
	publishDomainEvent,
	DOMAIN_EVENT_TYPES,
} from '@/lib/notifications/domain-events';
import { z } from 'zod';

const CreateQuestionSchema = z.object({
	productId: z.string().min(1, 'Product ID is required'),
	question: z
		.string()
		.trim()
		.min(5, 'Question must be at least 5 characters')
		.max(500, 'Question cannot exceed 500 characters'),
});

const CreateAnswerSchema = z.object({
	questionId: z.string().min(1, 'Question ID is required'),
	answer: z
		.string()
		.trim()
		.min(2, 'Answer must be at least 2 characters')
		.max(1000, 'Answer cannot exceed 1000 characters'),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>;

export type ProductQAAnswer = {
	id: string;
	answer: string;
	isOfficialSeller: boolean;
	isVerifiedBuyer: boolean;
	helpfulCount: number;
	hasVoted: boolean;
	createdAt: string;
	user: {
		id: string;
		name: string;
		picture: string;
	};
};

export type ProductQAItem = {
	id: string;
	question: string;
	status: QAModerationStatus;
	isPinned: boolean;
	helpfulCount: number;
	hasVoted: boolean;
	createdAt: string;
	user: {
		id: string;
		name: string;
		picture: string;
	};
	answers: ProductQAAnswer[];
};

export type ProductQAResponse = {
	questions: ProductQAItem[];
	totalQuestions: number;
	page: number;
	totalPages: number;
	legacyFaq: { question: string; answer: string }[];
};

export type StoreProductQAItem = {
	id: string;
	question: string;
	status: QAModerationStatus;
	isPinned: boolean;
	helpfulCount: number;
	createdAt: string;
	customer: {
		id: string;
		name: string;
		email: string;
		picture: string;
	};
	product: {
		id: string;
		name: string;
		slug: string;
		image: string;
	};
	answersCount: number;
	hasSellerAnswer: boolean;
	answers: {
		id: string;
		answer: string;
		isOfficialSeller: boolean;
		createdAt: string;
		user: {
			id: string;
			name: string;
		};
	}[];
};

export type StoreProductQAResponse = {
	questions: StoreProductQAItem[];
	totalQuestions: number;
	page: number;
	totalPages: number;
	counts: {
		all: number;
		needsAnswer: number;
		answered: number;
	};
};

/**
 * Fetch paginated questions and answers for a product.
 */
export async function getProductQA(
	productId: string,
	options: {
		page?: number;
		limit?: number;
		search?: string;
	} = {},
): Promise<ProductQAResponse> {
	if (!productId) {
		return {
			questions: [],
			totalQuestions: 0,
			page: 1,
			totalPages: 0,
			legacyFaq: [],
		};
	}

	const page = Math.max(1, options.page ?? 1);
	const limit = Math.max(1, Math.min(50, options.limit ?? 10));
	const skip = (page - 1) * limit;

	const user = await currentUser();
	const currentUserId = user?.id ?? null;

	const whereClause = {
		productId,
		status: QAModerationStatus.PUBLISHED,
		...(options.search?.trim()
			? {
					question: {
						contains: options.search.trim(),
						mode: 'insensitive' as const,
					},
				}
			: {}),
	};

	const [totalQuestions, rawQuestions, productLegacy] = await Promise.all([
		db.productQuestion.count({ where: whereClause }),
		db.productQuestion.findMany({
			where: whereClause,
			orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
			skip,
			take: limit,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						picture: true,
					},
				},
				votes: {
					select: {
						userId: true,
					},
				},
				answers: {
					where: {
						status: QAModerationStatus.PUBLISHED,
					},
					orderBy: [
						{ isOfficialSeller: 'desc' },
						{ isVerifiedBuyer: 'desc' },
						{ createdAt: 'asc' },
					],
					include: {
						user: {
							select: {
								id: true,
								name: true,
								picture: true,
							},
						},
						votes: {
							select: {
								userId: true,
							},
						},
					},
				},
			},
		}),
		db.product.findUnique({
			where: { id: productId },
			select: {
				questions: {
					select: {
						question: true,
						answer: true,
					},
				},
			},
		}),
	]);

	const questions: ProductQAItem[] = rawQuestions.map((q) => {
		const questionVoted = currentUserId
			? q.votes.some((v) => v.userId === currentUserId)
			: false;

		const answers: ProductQAAnswer[] = q.answers.map((a) => {
			const answerVoted = currentUserId
				? a.votes.some((v) => v.userId === currentUserId)
				: false;
			return {
				id: a.id,
				answer: a.answer,
				isOfficialSeller: a.isOfficialSeller,
				isVerifiedBuyer: a.isVerifiedBuyer,
				helpfulCount: a.votes.length,
				hasVoted: answerVoted,
				createdAt: a.createdAt.toISOString(),
				user: {
					id: a.user.id,
					name: a.user.name || 'Shopper',
					picture: a.user.picture || '',
				},
			};
		});

		return {
			id: q.id,
			question: q.question,
			status: q.status,
			isPinned: q.isPinned,
			helpfulCount: q.votes.length,
			hasVoted: questionVoted,
			createdAt: q.createdAt.toISOString(),
			user: {
				id: q.user.id,
				name: q.user.name || 'Shopper',
				picture: q.user.picture || '',
			},
			answers,
		};
	});

	return {
		questions,
		totalQuestions,
		page,
		totalPages: Math.ceil(totalQuestions / limit) || 1,
		legacyFaq: productLegacy?.questions ?? [],
	};
}

/**
 * Ask a new product question.
 */
export async function createProductQuestion(
	rawInput: CreateQuestionInput,
): Promise<{ success: boolean; question?: ProductQAItem; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'You must be signed in to ask a question.' };
	}

	const parsed = CreateQuestionSchema.safeParse(rawInput);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message ?? 'Invalid question input.',
		};
	}

	const { productId, question } = parsed.data;

	// Check rate limit: maximum 10 questions per user per hour
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	const recentQuestionsCount = await db.productQuestion.count({
		where: {
			userId: user.id,
			createdAt: { gte: oneHourAgo },
		},
	});

	if (recentQuestionsCount >= 10) {
		return {
			success: false,
			error: 'You have asked too many questions recently. Please wait a while before asking again.',
		};
	}

	const product = await db.product.findUnique({
		where: { id: productId },
		select: {
			id: true,
			name: true,
			slug: true,
			storeId: true,
		},
	});

	if (!product) {
		return { success: false, error: 'Product not found.' };
	}

	const newQuestion = await db.productQuestion.create({
		data: {
			productId,
			userId: user.id,
			question,
			status: QAModerationStatus.PUBLISHED,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					picture: true,
				},
			},
		},
	});

	// Emit domain event for notification to store seller
	try {
		await publishDomainEvent(db, {
			eventKey: `product-question:${newQuestion.id}`,
			eventType: DOMAIN_EVENT_TYPES.PRODUCT_QUESTION_ASKED,
			aggregateType: 'PRODUCT_QUESTION',
			aggregateId: newQuestion.id,
			actorUserId: user.id,
			storeId: product.storeId,
			payload: {
				questionId: newQuestion.id,
				productId: product.id,
				productName: product.name,
				productSlug: product.slug,
				question: newQuestion.question,
				authorName: user.firstName
					? `${user.firstName} ${user.lastName ?? ''}`.trim()
					: 'A customer',
			},
		});
	} catch (err) {
		console.error('Failed to dispatch question notification:', err);
	}

	return {
		success: true,
		question: {
			id: newQuestion.id,
			question: newQuestion.question,
			status: newQuestion.status,
			isPinned: newQuestion.isPinned,
			helpfulCount: 0,
			hasVoted: false,
			createdAt: newQuestion.createdAt.toISOString(),
			user: {
				id: newQuestion.user.id,
				name: newQuestion.user.name || 'Shopper',
				picture: newQuestion.user.picture || '',
			},
			answers: [],
		},
	};
}

/**
 * Answer an existing product question.
 */
export async function createProductAnswer(
	rawInput: CreateAnswerInput,
): Promise<{ success: boolean; answer?: ProductQAAnswer; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'You must be signed in to answer.' };
	}

	const parsed = CreateAnswerSchema.safeParse(rawInput);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message ?? 'Invalid answer input.',
		};
	}

	const { questionId, answer } = parsed.data;

	const targetQuestion = await db.productQuestion.findUnique({
		where: { id: questionId },
		include: {
			product: {
				select: {
					id: true,
					name: true,
					slug: true,
					storeId: true,
					store: {
						select: {
							userId: true,
						},
					},
				},
			},
		},
	});

	if (!targetQuestion) {
		return { success: false, error: 'Question not found.' };
	}

	const isSeller = targetQuestion.product.store.userId === user.id;
	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});
	const isAdmin = dbUser?.role === Role.ADMIN;

	if (!isSeller && !isAdmin) {
		return {
			success: false,
			error: 'Only the store seller or an admin can answer this question.',
		};
	}

	const newAnswer = await db.productAnswer.create({
		data: {
			questionId,
			userId: user.id,
			answer,
			isOfficialSeller: true,
			isVerifiedBuyer: false,
			status: QAModerationStatus.PUBLISHED,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					picture: true,
				},
			},
		},
	});

	// Emit notification event to question author
	try {
		await publishDomainEvent(db, {
			eventKey: `product-answer:${newAnswer.id}`,
			eventType: DOMAIN_EVENT_TYPES.PRODUCT_QUESTION_ANSWERED,
			aggregateType: 'PRODUCT_QUESTION',
			aggregateId: questionId,
			actorUserId: user.id,
			payload: {
				questionId,
				answerId: newAnswer.id,
				productId: targetQuestion.product.id,
				productName: targetQuestion.product.name,
				productSlug: targetQuestion.product.slug,
				answer: newAnswer.answer,
				authorName: isSeller ? 'Official Seller' : 'Store Admin',
				isOfficialSeller: true,
			},
		});
	} catch (err) {
		console.error('Failed to dispatch answer notification:', err);
	}

	return {
		success: true,
		answer: {
			id: newAnswer.id,
			answer: newAnswer.answer,
			isOfficialSeller: newAnswer.isOfficialSeller,
			isVerifiedBuyer: newAnswer.isVerifiedBuyer,
			helpfulCount: 0,
			hasVoted: false,
			createdAt: newAnswer.createdAt.toISOString(),
			user: {
				id: newAnswer.user.id,
				name: newAnswer.user.name || (isSeller ? 'Official Seller' : 'Shopper'),
				picture: newAnswer.user.picture || '',
			},
		},
	};
}

/**
 * Toggle a helpful vote on a question.
 */
export async function toggleQuestionVote(
	questionId: string,
): Promise<{ success: boolean; voted: boolean; helpfulCount: number; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, voted: false, helpfulCount: 0, error: 'Sign in to vote.' };
	}

	const existing = await db.productQuestionVote.findUnique({
		where: {
			questionId_userId: {
				questionId,
				userId: user.id,
			},
		},
	});

	if (existing) {
		await db.productQuestionVote.delete({
			where: {
				questionId_userId: {
					questionId,
					userId: user.id,
				},
			},
		});
	} else {
		await db.productQuestionVote.create({
			data: {
				questionId,
				userId: user.id,
			},
		});
	}

	const helpfulCount = await db.productQuestionVote.count({
		where: { questionId },
	});

	return {
		success: true,
		voted: !existing,
		helpfulCount,
	};
}

/**
 * Toggle a helpful vote on an answer.
 */
export async function toggleAnswerVote(
	answerId: string,
): Promise<{ success: boolean; voted: boolean; helpfulCount: number; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, voted: false, helpfulCount: 0, error: 'Sign in to vote.' };
	}

	const existing = await db.productAnswerVote.findUnique({
		where: {
			answerId_userId: {
				answerId,
				userId: user.id,
			},
		},
	});

	if (existing) {
		await db.productAnswerVote.delete({
			where: {
				answerId_userId: {
					answerId,
					userId: user.id,
				},
			},
		});
	} else {
		await db.productAnswerVote.create({
			data: {
				answerId,
				userId: user.id,
			},
		});
	}

	const helpfulCount = await db.productAnswerVote.count({
		where: { answerId },
	});

	return {
		success: true,
		voted: !existing,
		helpfulCount,
	};
}

/**
 * Moderate or pin/unpin a question (seller or admin).
 */
export async function moderateProductQuestion(
	questionId: string,
	action: {
		status?: QAModerationStatus;
		isPinned?: boolean;
	},
): Promise<{ success: boolean; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Unauthorized.' };
	}

	const question = await db.productQuestion.findUnique({
		where: { id: questionId },
		include: {
			product: {
				select: {
					store: { select: { userId: true } },
				},
			},
		},
	});

	if (!question) {
		return { success: false, error: 'Question not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	const isSeller = question.product.store.userId === user.id;
	const isAdmin = dbUser?.role === Role.ADMIN;

	if (!isSeller && !isAdmin) {
		return { success: false, error: 'You do not have permission to moderate this question.' };
	}

	await db.productQuestion.update({
		where: { id: questionId },
		data: {
			...(action.status ? { status: action.status } : {}),
			...(typeof action.isPinned === 'boolean' ? { isPinned: action.isPinned } : {}),
		},
	});

	return { success: true };
}

/**
 * Moderate an answer (seller or admin).
 */
export async function moderateProductAnswer(
	answerId: string,
	status: QAModerationStatus,
): Promise<{ success: boolean; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Unauthorized.' };
	}

	const answer = await db.productAnswer.findUnique({
		where: { id: answerId },
		include: {
			question: {
				select: {
					product: {
						select: {
							store: { select: { userId: true } },
						},
					},
				},
			},
		},
	});

	if (!answer) {
		return { success: false, error: 'Answer not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	const isSeller = answer.question.product.store.userId === user.id;
	const isAdmin = dbUser?.role === Role.ADMIN;

	if (!isSeller && !isAdmin) {
		return { success: false, error: 'You do not have permission to moderate this answer.' };
	}

	await db.productAnswer.update({
		where: { id: answerId },
		data: { status },
	});

	return { success: true };
}

/**
 * Delete a question (author, seller, or admin).
 */
export async function deleteProductQuestion(
	questionId: string,
): Promise<{ success: boolean; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Unauthorized.' };
	}

	const question = await db.productQuestion.findUnique({
		where: { id: questionId },
		include: {
			product: {
				select: {
					store: { select: { userId: true } },
				},
			},
		},
	});

	if (!question) {
		return { success: false, error: 'Question not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	const isAuthor = question.userId === user.id;
	const isSeller = question.product.store.userId === user.id;
	const isAdmin = dbUser?.role === Role.ADMIN;

	if (!isAuthor && !isSeller && !isAdmin) {
		return { success: false, error: 'Permission denied.' };
	}

	await db.productQuestion.delete({
		where: { id: questionId },
	});

	return { success: true };
}

/**
 * Delete an answer (author, seller, or admin).
 */
export async function deleteProductAnswer(
	answerId: string,
): Promise<{ success: boolean; error?: string }> {
	const user = await currentUser();
	if (!user) {
		return { success: false, error: 'Unauthorized.' };
	}

	const answer = await db.productAnswer.findUnique({
		where: { id: answerId },
		include: {
			question: {
				select: {
					product: {
						select: {
							store: { select: { userId: true } },
						},
					},
				},
			},
		},
	});

	if (!answer) {
		return { success: false, error: 'Answer not found.' };
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	const isAuthor = answer.userId === user.id;
	const isSeller = answer.question.product.store.userId === user.id;
	const isAdmin = dbUser?.role === Role.ADMIN;

	if (!isAuthor && !isSeller && !isAdmin) {
		return { success: false, error: 'Permission denied.' };
	}

	await db.productAnswer.delete({
		where: { id: answerId },
	});

	return { success: true };
}

/**
 * Fetch questions and answers for a specific store's products in the seller dashboard.
 */
export async function getStoreProductQA(
	storeUrl: string,
	options: {
		page?: number;
		limit?: number;
		search?: string;
		filter?: 'all' | 'needs_answer' | 'answered';
	} = {},
): Promise<StoreProductQAResponse> {
	if (!storeUrl) {
		return {
			questions: [],
			totalQuestions: 0,
			page: 1,
			totalPages: 0,
			counts: { all: 0, needsAnswer: 0, answered: 0 },
		};
	}

	const user = await currentUser();
	if (!user) {
		return {
			questions: [],
			totalQuestions: 0,
			page: 1,
			totalPages: 0,
			counts: { all: 0, needsAnswer: 0, answered: 0 },
		};
	}

	const store = await db.store.findUnique({
		where: { url: storeUrl },
		select: { id: true, userId: true },
	});

	if (!store) {
		return {
			questions: [],
			totalQuestions: 0,
			page: 1,
			totalPages: 0,
			counts: { all: 0, needsAnswer: 0, answered: 0 },
		};
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	const isOwner = store.userId === user.id;
	const isAdmin = dbUser?.role === Role.ADMIN;
	if (!isOwner && !isAdmin) {
		return {
			questions: [],
			totalQuestions: 0,
			page: 1,
			totalPages: 0,
			counts: { all: 0, needsAnswer: 0, answered: 0 },
		};
	}

	const page = Math.max(1, options.page ?? 1);
	const limit = Math.max(1, Math.min(50, options.limit ?? 10));
	const skip = (page - 1) * limit;

	const baseStoreWhere = {
		product: {
			storeId: store.id,
		},
	};

	const searchFilter = options.search?.trim()
		? {
				OR: [
					{
						question: {
							contains: options.search.trim(),
							mode: 'insensitive' as const,
						},
					},
					{
						product: {
							name: {
								contains: options.search.trim(),
								mode: 'insensitive' as const,
							},
						},
					},
					{
						user: {
							name: {
								contains: options.search.trim(),
								mode: 'insensitive' as const,
							},
						},
					},
				],
		  }
		: {};

	const statusFilter =
		options.filter === 'needs_answer'
			? {
					answers: {
						none: {
							isOfficialSeller: true,
						},
					},
			  }
			: options.filter === 'answered'
			? {
					answers: {
						some: {
							isOfficialSeller: true,
						},
					},
			  }
			: {};

	const whereClause = {
		...baseStoreWhere,
		...searchFilter,
		...statusFilter,
	};

	const [totalQuestions, rawQuestions, allCount, needsAnswerCount, answeredCount] =
		await Promise.all([
			db.productQuestion.count({ where: whereClause }),
			db.productQuestion.findMany({
				where: whereClause,
				orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
				skip,
				take: limit,
				include: {
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
									images: {
										take: 1,
										select: { url: true },
									},
								},
							},
						},
					},
					votes: {
						select: {
							userId: true,
						},
					},
					answers: {
						orderBy: [{ createdAt: 'asc' }],
						include: {
							user: {
								select: {
									id: true,
									name: true,
									picture: true,
								},
							},
						},
					},
				},
			}),
			db.productQuestion.count({ where: baseStoreWhere }),
			db.productQuestion.count({
				where: {
					...baseStoreWhere,
					answers: { none: { isOfficialSeller: true } },
				},
			}),
			db.productQuestion.count({
				where: {
					...baseStoreWhere,
					answers: { some: { isOfficialSeller: true } },
				},
			}),
		]);

	const questions: StoreProductQAItem[] = rawQuestions.map((q) => {
		const hasSellerAnswer = q.answers.some((a) => a.isOfficialSeller);
		const productImage =
			q.product.variants[0]?.images[0]?.url || '/placeholder.png';

		return {
			id: q.id,
			question: q.question,
			status: q.status,
			isPinned: q.isPinned,
			helpfulCount: q.votes.length,
			createdAt: q.createdAt.toISOString(),
			customer: {
				id: q.user.id,
				name: q.user.name || 'Shopper',
				email: q.user.email || '',
				picture: q.user.picture || '',
			},
			product: {
				id: q.product.id,
				name: q.product.name,
				slug: q.product.slug,
				image: productImage,
			},
			answersCount: q.answers.length,
			hasSellerAnswer,
			answers: q.answers.map((a) => ({
				id: a.id,
				answer: a.answer,
				isOfficialSeller: a.isOfficialSeller,
				createdAt: a.createdAt.toISOString(),
				user: {
					id: a.user.id,
					name: a.user.name || 'Seller',
				},
			})),
		};
	});

	return {
		questions,
		totalQuestions,
		page,
		totalPages: Math.ceil(totalQuestions / limit) || 1,
		counts: {
			all: allCount,
			needsAnswer: needsAnswerCount,
			answered: answeredCount,
		},
	};
}
