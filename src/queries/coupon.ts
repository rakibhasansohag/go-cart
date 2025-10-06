'use server';

import { CartWithCartItemsType } from '@/lib/types';
import { db } from '@/lib/db';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Applies a coupon to a cart for items belonging to the coupon's store.
 *
 * @param couponCode - The coupon code to apply.
 * @param cartId - The ID of the cart to apply the coupon to.
 * @returns A message indicating success or failure, along with the updated cart.
 */

export const applyCoupon = async (
	couponCode: string,
	cartId: string,
): Promise<{ message: string; cart: CartWithCartItemsType }> => {
	try {
		// Step 1: Fetch the coupon details
		const coupon = await db.coupon.findUnique({
			where: {
				code: couponCode,
			},
			include: {
				store: true,
			},
		});

		if (!coupon) {
			throw new Error('Invalid coupon code.');
		}

		// Step 2: Validate the coupon's date range
		const currentDate = new Date();
		const startDate = new Date(coupon.startDate);
		const endDate = new Date(coupon.endDate);

		if (currentDate < startDate || currentDate > endDate) {
			throw new Error('Coupon is expired or not yet active.');
		}

		// Step 3: Fetch the cart and validate its existence
		const cart = await db.cart.findUnique({
			where: {
				id: cartId,
			},
			include: {
				cartItems: true,
				coupon: true,
			},
		});

		if (!cart) {
			throw new Error('Cart not found.');
		}

		// Step 4: Ensure no coupon is already applied to the cart
		if (cart.couponId) {
			throw new Error('A coupon is already applied to this cart.');
		}

		// Step 5: Filter items from the store associated with the coupon
		const storeId = coupon.storeId;

		const storeItems = cart.cartItems.filter(
			(item) => item.storeId === storeId,
		);

		if (storeItems.length === 0) {
			throw new Error(
				'No items in the cart belong to the store associated with this coupon.',
			);
		}

		// Step 6: Calculate the discount on the store's items
		const storeSubTotal = storeItems.reduce(
			(acc, item) => acc + item.price * item.quantity,
			0,
		);

		const storeShippingTotal = storeItems.reduce(
			(acc, item) => acc + item.shippingFee,
			0,
		);

		const storeTotal = storeSubTotal + storeShippingTotal;

		const discountedAmount = (storeTotal * coupon.discount) / 100;

		const newTotal = cart.total - discountedAmount;

		// Step 7: Update the cart with the applied coupon and new total
		const updatedCart = await db.cart.update({
			where: {
				id: cartId,
			},
			data: {
				couponId: coupon.id,
				total: newTotal,
			},
			include: {
				cartItems: true,
				coupon: {
					include: {
						store: true,
					},
				},
			},
		});

		return {
			message: `Coupon applied successfully. Discount: -$${discountedAmount.toFixed(
				2,
			)} applied to items from ${coupon.store.name}.`,
			cart: updatedCart,
		};
	} catch (error: any) {
		throw error;
	}
};
