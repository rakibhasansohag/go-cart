'use server';

import { currentUser } from '@clerk/nextjs/server';
import { db } from '../lib/db';

/** Point: Function addToWishlist
 * Add a product to the user's wishlist.
 * @param productId - The ID of the product to add to the wishlist.
 * @param variantId - The ID of the product variant.
 * @param sizeId - Optional size ID if applicable.
 * @returns The created wishlist item.
 */
export const addToWishlist = async (
	productId: string,
	variantId: string,
	sizeId?: string,
) => {
	// Ensure the user is authenticated
	const user = await currentUser();

	if (!user) throw new Error('Unauthenticated.');

	const userId = user.id;

	try {
		const existingWIshlistItem = await db.wishlist.findFirst({
			where: {
				userId,
				productId,
				variantId,
			},
		});

		if (existingWIshlistItem) {
			throw new Error('Product is already in the wishlist');
		}

		return await db.wishlist.create({
			data: {
				userId,
				productId,
				variantId,
				sizeId,
			},
		});
	} catch (error) {
		throw error;
	}
};

/**
 * @name followStore
 * @description - Toggle follow status for a store by the current user.
 *              - If the user is not following the store, it follows the store.
 *              - If the user is already following the store, it unfollows the store.
 * @access User
 * @param storeId - The ID of the store to be followed/unfollowed.
 * @returns {boolean} - Returns true if the user is now following the store, false if unfollowed.
 */

export const followStore = async (storeId: string): Promise<boolean> => {
  try {
		// Get the currently authenticated user
		const user = await currentUser();

		// Ensure the user is authenticated
		if (!user) throw new Error('Unauthenticated');

		// Check if the store exists
		const store = await db.store.findUnique({
			where: {
				id: storeId,
			},
		});

		if (!store) throw new Error('Store not found.');

		// Check if the user exists
		const userData = await db.user.findUnique({
			where: {
				id: user.id,
			},
		});
		if (!userData) throw new Error('User not found.');

		// TODO: when we added user following store remove the console .log
		// Check if the user is already following the store
		const userFollowingStore = await db.user.findFirst({
			where: {
				id: user.id,
				// following: {
				//   some: {
				//     id: storeId,
				//   },
				// },
			},
		});

		if (userFollowingStore) {
			// Unfollow the store and return false
			await db.store.update({
				where: {
					id: storeId,
				},
				data: {
					//   followers: {
					//     disconnect: { id: userData.id },
					//   },
				},
			});
			return false;
		} else {
			// Follow the store and return true
			await db.store.update({
				where: {
					id: storeId,
				},
				data: {
					// followers: {
					// 	connect: {
					// 		id: userData.id,
					// 	},
					// },
				},
			});
			return true;
		}
	} catch (error) {
    throw error;
  }
};
