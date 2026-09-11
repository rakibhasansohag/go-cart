'use server';

import { db } from '@/lib/db';
import { ReviewDetailsType } from '@/lib/types';
import { OrderStatus } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';
import { getRatingStatistics } from './product';

// Function: upsertReview
// Description: Upserts a review into the database, updating if it exists or creating a new one if not.
// Permission Level: Admin only for creation/updation of reviews.
// Parameters:
//   - productId: ID of the product the review is associated with.
//   - review: Review object containing details of the review to be upserted.
// Returns: Updated or newly created review details.
export const upsertReview = async (
	productId: string,
	review: ReviewDetailsType,
) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Ensure productId and review data are provided
		if (!productId) throw new Error('Product ID is required.');
		if (!review) throw new Error('Please provide review data.');

		// check for existing review
		const existingReview = await db.review.findFirst({
			where: {
				productId,
				userId: user.id,
				variant: review.variant,
			},
		});

		let review_data: ReviewDetailsType = review;
		if (existingReview) {
			review_data = { ...review_data, id: existingReview.id };
		}

		// Detect verified purchase (user has a delivered order containing this product)
		const deliveredItem = await db.orderItem.findFirst({
			where: {
				productId,
				orderGroup: {
					order: { userId: user.id },
					status: OrderStatus.Delivered,
				},
			},
		});
		const isVerifiedPurchase = !!deliveredItem;

		// Upsert review into the database
		const reviewDetails = await db.review.upsert({
			where: {
				id: review_data.id,
			},
			update: {
				...review_data,
				isVerifiedPurchase,
				images: {
					deleteMany: {},
					create: review_data.images.map((img) => ({
						url: img.url,
					})),
				},
				userId: user.id,
			},
			create: {
				...review_data,
				isVerifiedPurchase,
				images: {
					create: review_data.images.map((img) => ({
						url: img.url,
					})),
				},
				productId,
				userId: user.id,
			},
			include: {
				images: true,
				user: true,
				reply: { include: { store: true } },
				votes: { where: { userId: user.id } },
			},
		});

		const mappedReview = {
			...reviewDetails,
			hasVoted:
				reviewDetails.votes.length > 0
					? reviewDetails.votes[0].helpful
					: null,
			reply: reviewDetails.reply ?? null,
		};


		// Calculate the new average rating
		const productReviews = await db.review.findMany({
			where: {
				productId,
			},
			select: {
				rating: true,
			},
		});

		const totalRating = productReviews.reduce(
			(acc, rev) => acc + rev.rating,
			0,
		);

		const averageRating = totalRating / productReviews.length;

		// Update the product rating
		await db.product.update({
			where: {
				id: productId,
			},
			data: {
				rating: averageRating, // Update the product rating with the new average
				numReviews: productReviews.length, // Update the number of reviews
			},
		});
		const statistics = await getRatingStatistics(productId);
		const message = existingReview
			? 'Your review has been updated successfully!'
			: 'Thank you for submitting your review!';

		return {
			review: mappedReview,
			rating: averageRating,
			statistics,
			message,
		};
	} catch (error) {
		// Log and re-throw any errors
		throw error;
	}
};
