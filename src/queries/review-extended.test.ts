import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		user: {
			findUnique: vi.fn(),
		},
		review: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
			update: vi.fn(),
		},
		reviewVote: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		reviewReply: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
			delete: vi.fn(),
		},
		store: {
			findUnique: vi.fn(),
		},
	},
	revalidatePath: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: harness.currentUser,
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

vi.mock('next/cache', () => ({
	revalidatePath: harness.revalidatePath,
}));

import {
	toggleReviewHelpfulVote,
	replyToReview,
	deleteReviewReply,
	getStoreReviews,
} from './review-actions';

describe('Review Actions & Extended Functionality', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('toggleReviewHelpfulVote', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(
				toggleReviewHelpfulVote('review_1', true)
			).rejects.toThrow('Unauthenticated.');
		});

		it('throws when user not found in database', async () => {
			harness.currentUser.mockResolvedValue({ id: 'user_1' });
			harness.db.user.findUnique.mockResolvedValue(null);

			await expect(
				toggleReviewHelpfulVote('review_1', true)
			).rejects.toThrow('User not found in database.');
		});

		it('adds new helpful vote and increments helpfulCount', async () => {
			harness.currentUser.mockResolvedValue({ id: 'user_1' });
			harness.db.user.findUnique.mockResolvedValue({ id: 'user_1' });
			harness.db.reviewVote.findUnique.mockResolvedValue(null);

			const result = await toggleReviewHelpfulVote('review_1', true);

			expect(harness.db.reviewVote.create).toHaveBeenCalledWith({
				data: { reviewId: 'review_1', userId: 'user_1', helpful: true },
			});
			expect(harness.db.review.update).toHaveBeenCalledWith({
				where: { id: 'review_1' },
				data: { helpfulCount: { increment: 1 } },
			});
			expect(result).toEqual({ action: 'added', helpful: true });
		});

		it('removes vote when toggling identical vote value', async () => {
			harness.currentUser.mockResolvedValue({ id: 'user_1' });
			harness.db.user.findUnique.mockResolvedValue({ id: 'user_1' });
			harness.db.reviewVote.findUnique.mockResolvedValue({
				id: 'vote_1',
				userId: 'user_1',
				reviewId: 'review_1',
				helpful: true,
			});

			const result = await toggleReviewHelpfulVote('review_1', true);

			expect(harness.db.reviewVote.delete).toHaveBeenCalledWith({
				where: { userId_reviewId: { userId: 'user_1', reviewId: 'review_1' } },
			});
			expect(harness.db.review.update).toHaveBeenCalledWith({
				where: { id: 'review_1' },
				data: { helpfulCount: { decrement: 1 } },
			});
			expect(result).toEqual({ action: 'removed', helpful: null });
		});

		it('flips vote from helpful to not-helpful and decrements helpfulCount', async () => {
			harness.currentUser.mockResolvedValue({ id: 'user_1' });
			harness.db.user.findUnique.mockResolvedValue({ id: 'user_1' });
			harness.db.reviewVote.findUnique.mockResolvedValue({
				id: 'vote_1',
				userId: 'user_1',
				reviewId: 'review_1',
				helpful: true,
			});

			const result = await toggleReviewHelpfulVote('review_1', false);

			expect(harness.db.reviewVote.update).toHaveBeenCalledWith({
				where: { userId_reviewId: { userId: 'user_1', reviewId: 'review_1' } },
				data: { helpful: false },
			});
			expect(harness.db.review.update).toHaveBeenCalledWith({
				where: { id: 'review_1' },
				data: { helpfulCount: { increment: -1 } },
			});
			expect(result).toEqual({ action: 'flipped', helpful: false });
		});
	});

	describe('replyToReview', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(
				replyToReview('review_1', 'Thank you for your feedback!')
			).rejects.toThrow('Unauthenticated.');
		});

		it('throws when review is not found', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_1' });
			harness.db.review.findUnique.mockResolvedValue(null);

			await expect(
				replyToReview('review_nonexistent', 'Response')
			).rejects.toThrow('Review not found.');
		});

		it('rejects when caller does not own the store for the reviewed product', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_other' });
			harness.db.review.findUnique.mockResolvedValue({
				id: 'review_1',
				product: {
					slug: 'product-slug',
					store: { id: 'store_1', userId: 'seller_owner' },
				},
			});

			await expect(
				replyToReview('review_1', 'Response')
			).rejects.toThrow('Unauthorized.');
		});

		it('creates or updates seller reply and revalidates product page', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_owner' });
			harness.db.review.findUnique.mockResolvedValue({
				id: 'review_1',
				product: {
					slug: 'product-slug',
					store: { id: 'store_1', userId: 'seller_owner' },
				},
			});
			const mockReply = {
				id: 'reply_1',
				reviewId: 'review_1',
				storeId: 'store_1',
				body: 'Thank you so much!',
				store: { id: 'store_1', name: 'My Store', url: 'my-store' },
			};
			harness.db.reviewReply.upsert.mockResolvedValue(mockReply);

			const result = await replyToReview('review_1', '  Thank you so much!  ');

			expect(harness.db.reviewReply.upsert).toHaveBeenCalledWith({
				where: { reviewId: 'review_1' },
				update: { body: 'Thank you so much!' },
				create: { reviewId: 'review_1', storeId: 'store_1', body: 'Thank you so much!' },
				include: { store: true },
			});
			expect(harness.revalidatePath).toHaveBeenCalledWith('/product/product-slug');
			expect(result).toEqual({ reply: mockReply });
		});
	});

	describe('deleteReviewReply', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(deleteReviewReply('review_1')).rejects.toThrow('Unauthenticated.');
		});

		it('throws when reply does not exist', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_1' });
			harness.db.reviewReply.findUnique.mockResolvedValue(null);

			await expect(deleteReviewReply('review_1')).rejects.toThrow('Reply not found.');
		});

		it('rejects when caller does not own the reply store', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_intruder' });
			harness.db.reviewReply.findUnique.mockResolvedValue({
				id: 'reply_1',
				reviewId: 'review_1',
				store: { id: 'store_1', userId: 'seller_owner' },
				review: { product: { slug: 'product-slug' } },
			});

			await expect(deleteReviewReply('review_1')).rejects.toThrow('Unauthorized.');
		});

		it('deletes reply and revalidates product path when authorized', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_owner' });
			harness.db.reviewReply.findUnique.mockResolvedValue({
				id: 'reply_1',
				reviewId: 'review_1',
				store: { id: 'store_1', userId: 'seller_owner' },
				review: { product: { slug: 'product-slug' } },
			});

			const result = await deleteReviewReply('review_1');

			expect(harness.db.reviewReply.delete).toHaveBeenCalledWith({
				where: { reviewId: 'review_1' },
			});
			expect(harness.revalidatePath).toHaveBeenCalledWith('/product/product-slug');
			expect(result).toEqual({ success: true });
		});
	});

	describe('getStoreReviews', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(getStoreReviews('my-store')).rejects.toThrow('Unauthenticated.');
		});

		it('rejects when store is not found or caller is not owner', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_other' });
			harness.db.store.findUnique.mockResolvedValue({
				id: 'store_1',
				userId: 'seller_real_owner',
			});

			await expect(getStoreReviews('my-store')).rejects.toThrow('Unauthorized.');
		});

		it('returns paginated store reviews with reply data', async () => {
			harness.currentUser.mockResolvedValue({ id: 'seller_owner' });
			harness.db.store.findUnique.mockResolvedValue({
				id: 'store_1',
				userId: 'seller_owner',
			});

			const mockReviews = [
				{
					id: 'rev_1',
					rating: 5,
					review: 'Excellent!',
					reply: null,
					user: { id: 'u1', name: 'Buyer 1' },
					product: { name: 'Item 1', slug: 'item-1' },
				},
			];
			harness.db.review.count.mockResolvedValue(1);
			harness.db.review.findMany.mockResolvedValue(mockReviews);

			const result = await getStoreReviews('my-store', 1, 10);

			expect(harness.db.review.count).toHaveBeenCalledWith({
				where: { product: { storeId: 'store_1' } },
			});
			expect(harness.db.review.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { product: { storeId: 'store_1' } },
					skip: 0,
					take: 10,
				})
			);
			expect(result).toEqual({
				reviews: mockReviews,
				total: 1,
				totalPages: 1,
			});
		});
	});
});
