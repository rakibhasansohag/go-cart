'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Function: toggleReviewHelpfulVote
// Description: Toggles a helpful/not-helpful vote for a review. If the user has already voted the same way, it removes the vote. If different, it flips it.
// Access Level: Authenticated users
export const toggleReviewHelpfulVote = async (
	reviewId: string,
	helpful: boolean,
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const dbUser = await db.user.findUnique({ where: { id: user.id } });
	if (!dbUser) throw new Error('User not found in database.');

	const existing = await db.reviewVote.findUnique({
		where: { userId_reviewId: { userId: user.id, reviewId } },
	});

	if (existing) {
		if (existing.helpful === helpful) {
			// Same vote — toggle off (delete)
			await db.reviewVote.delete({
				where: { userId_reviewId: { userId: user.id, reviewId } },
			});
			await db.review.update({
				where: { id: reviewId },
				data: { helpfulCount: { decrement: helpful ? 1 : 0 } },
			});
			return { action: 'removed', helpful: null };
		} else {
			// Different vote — flip
			await db.reviewVote.update({
				where: { userId_reviewId: { userId: user.id, reviewId } },
				data: { helpful },
			});
			await db.review.update({
				where: { id: reviewId },
				data: { helpfulCount: { increment: helpful ? 1 : -1 } },
			});
			return { action: 'flipped', helpful };
		}
	}

	// New vote
	await db.reviewVote.create({
		data: { reviewId, userId: user.id, helpful },
	});
	if (helpful) {
		await db.review.update({
			where: { id: reviewId },
			data: { helpfulCount: { increment: 1 } },
		});
	}
	return { action: 'added', helpful };
};

// Function: replyToReview
// Description: Creates or updates the seller official reply for a review. A review can only have one reply. The calling user must own the store.
// Access Level: Seller (must own the store the product belongs to)
export const replyToReview = async (reviewId: string, body: string) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	// Resolve the store owned by this seller for the review's product
	const review = await db.review.findUnique({
		where: { id: reviewId },
		include: { product: { include: { store: true } } },
	});
	if (!review) throw new Error('Review not found.');

	const store = review.product.store;
	if (store.userId !== user.id) throw new Error('Unauthorized.');

	const reply = await db.reviewReply.upsert({
		where: { reviewId },
		update: { body: body.trim() },
		create: { reviewId, storeId: store.id, body: body.trim() },
		include: { store: true },
	});

	revalidatePath(`/product/${review.product.slug}`);
	return { reply };
};

// Function: deleteReviewReply
// Description: Deletes the seller's reply for a review. The calling user must own the store.
// Access Level: Seller (must own the store)
export const deleteReviewReply = async (reviewId: string) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const existing = await db.reviewReply.findUnique({
		where: { reviewId },
		include: {
			store: true,
			review: { include: { product: { select: { slug: true } } } },
		},
	});
	if (!existing) throw new Error('Reply not found.');
	if (existing.store.userId !== user.id) throw new Error('Unauthorized.');

	await db.reviewReply.delete({ where: { reviewId } });
	if (existing.review?.product?.slug) {
		revalidatePath(`/product/${existing.review.product.slug}`);
	}
	return { success: true };
};

// Function: getStoreReviews
// Description: Fetches paginated reviews for all products in a given store with reply data, for the seller dashboard.
// Access Level: Seller (must own the store)
export const getStoreReviews = async (
	storeUrl: string,
	page: number = 1,
	pageSize: number = 10,
	ratingFilter?: number,
	replyFilter?: 'replied' | 'unreplied',
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const store = await db.store.findUnique({
		where: { url: storeUrl },
		select: { id: true, userId: true },
	});
	if (!store || store.userId !== user.id) throw new Error('Unauthorized.');

	const where = {
		product: { storeId: store.id },
		...(ratingFilter ? { rating: { gte: ratingFilter, lt: ratingFilter + 1 } } : {}),
		...(replyFilter === 'replied' ? { reply: { isNot: null } } : {}),
		...(replyFilter === 'unreplied' ? { reply: null } : {}),
	};

	const [total, reviews] = await Promise.all([
		db.review.count({ where }),
		db.review.findMany({
			where,
			include: {
				images: true,
				user: true,
				reply: { include: { store: true } },
				product: { select: { name: true, slug: true } },
			},
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
	]);

	return { reviews, total, totalPages: Math.ceil(total / pageSize) };
};
