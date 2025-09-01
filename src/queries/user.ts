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
