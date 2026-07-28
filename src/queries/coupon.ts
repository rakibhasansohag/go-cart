'use server';

import { CartWithCartItemsType } from '@/lib/types';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { Coupon } from '@prisma/client';

/**
 * Retrieves the active featured coupon for the homepage promo banner.
 */
export const getFeaturedCoupon = async () => {
	try {
		const coupon = await db.coupon.findFirst({
			orderBy: { createdAt: 'desc' },
			include: { store: true },
		});

		if (coupon) {
			return {
				id: coupon.id,
				code: coupon.code,
				discount: coupon.discount,
				storeName: coupon.store?.name || 'Featured Store',
			};
		}
	} catch (error) {
		/* fallback */
	}

	return {
		id: 'welcome-rakib',
		code: 'RAKIB',
		discount: 87,
		storeName: 'GoCart Exclusive',
	};
};

export const upsertCoupon = async (coupon: Coupon, storeUrl: string) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Verify seller permission
		if (user.privateMetadata.role !== 'SELLER')
			throw new Error(
				'Unauthorized Access: Seller Privileges Required for Entry.',
			);

		// Ensure coupon data and storeUrl are provided
		if (!coupon) throw new Error('Please provide coupon data.');
		if (!storeUrl) throw new Error('Store URL is required.');

		// Retrieve store ID using storeUrl
		const store = await db.store.findUnique({
			where: { url: storeUrl },
		});

		if (!store) throw new Error('Store not found.');

		// Throw error if a coupon with the same code and storeId already exists
		const existingCoupon = await db.coupon.findFirst({
			where: {
				AND: [
					{ code: coupon.code },
					{ storeId: store.id },
					{
						NOT: {
							id: coupon.id,
						},
					},
				],
			},
		});

		if (existingCoupon) {
			throw new Error(
				'A coupon with the same code already exists for this store.',
			);
		}

		// Upsert coupon into the database
		const couponDetails = await db.coupon.upsert({
			where: {
				id: coupon.id,
			},
			update: {
				code: coupon.code,
				startDate: coupon.startDate,
				endDate: coupon.endDate,
				discount: coupon.discount,
				maxUses: coupon.maxUses ?? 0,
				storeId: store.id,
			},
			create: {
				id: coupon.id,
				code: coupon.code,
				startDate: coupon.startDate,
				endDate: coupon.endDate,
				discount: coupon.discount,
				maxUses: coupon.maxUses ?? 0,
				storeId: store.id,
			},
		});

		return couponDetails;
	} catch (error) {
		throw error;
	}
};

export const validateCouponCode = async (code: string) => {
	try {
		const coupon = await db.coupon.findUnique({
			where: { code: code.toUpperCase().trim() },
			include: { store: true },
		});

		if (!coupon) {
			throw new Error('Coupon code not found.');
		}

		const currentDate = new Date();
		const startDate = new Date(coupon.startDate);
		const endDate = new Date(coupon.endDate);

		if (currentDate > endDate) {
			throw new Error(`This coupon expired on ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`);
		}

		if (currentDate < startDate) {
			throw new Error(`This coupon is inactive until ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`);
		}

		// Calculate successful redemptions (Paid orders only)
		const successfulRedemptions = await db.orderGroup.count({
			where: {
				couponId: coupon.id,
				order: { paymentStatus: 'Paid' },
			},
		});

		if (coupon.maxUses > 0 && successfulRedemptions >= coupon.maxUses) {
			throw new Error(`This coupon is inactive (limit of ${coupon.maxUses} uses reached).`);
		}

		// Verify single-use per customer
		const user = await currentUser();
		if (user) {
			const hasUsed = await db.coupon.findFirst({
				where: {
					id: coupon.id,
					users: {
						some: { id: user.id },
					},
				},
			});
			if (hasUsed) {
				throw new Error('You have already redeemed this single-use coupon.');
			}
		}

		return {
			id: coupon.id,
			code: coupon.code,
			discount: coupon.discount,
			storeId: coupon.storeId,
			storeName: coupon.store.name,
			maxUses: coupon.maxUses,
			usedCount: successfulRedemptions,
		};
	} catch (error: any) {
		throw new Error(error.message || 'Failed to validate coupon code.');
	}
};

/**
 * Retrieves redemption trace history for a coupon (Paid orders only).
 */
export const getCouponRedemptions = async (couponId: string) => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const redemptions = await db.orderGroup.findMany({
			where: {
				couponId: couponId,
				order: {
					paymentStatus: 'Paid',
				},
			},
			orderBy: { createdAt: 'desc' },
			include: {
				order: {
					include: {
						user: {
							select: {
								name: true,
								email: true,
								picture: true,
							},
						},
						shippingAddress: {
							include: {
								user: true,
							},
						},
					},
				},
			},
		});

		return redemptions.map((g) => ({
			id: g.id,
			orderId: g.orderId,
			total: g.total,
			createdAt: g.createdAt,
			customerName: g.order?.shippingAddress
				? `${g.order.shippingAddress.firstName || ''} ${g.order.shippingAddress.lastName || ''}`.trim()
				: g.order?.user?.name || 'Customer',
			customerEmail: g.order?.shippingAddress?.user?.email || g.order?.user?.email || 'N/A',
			userPicture: g.order?.user?.picture || null,
		}));
	} catch (error) {
		throw error;
	}
};

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

/**
 * Applies a coupon to an existing unpaid order and recalculates the order group totals.
 */
export const applyCouponToOrder = async (
	couponCode: string,
	orderId: string,
) => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		if (!couponCode || !couponCode.trim()) {
			throw new Error('Please enter a valid coupon code.');
		}

		// 1. Fetch Order with groups and items
		const order = await db.order.findUnique({
			where: {
				id: orderId,
				userId: user.id,
			},
			include: {
				groups: {
					include: {
						items: true,
						coupon: true,
					},
				},
			},
		});

		if (!order) throw new Error('Order not found.');

		if (order.paymentStatus === 'Paid') {
			throw new Error('Cannot apply coupon to an already paid order.');
		}

		// 2. Fetch & Validate Coupon
		const coupon = await db.coupon.findUnique({
			where: {
				code: couponCode.trim().toUpperCase(),
			},
			include: {
				store: true,
			},
		});

		if (!coupon) {
			throw new Error('Invalid coupon code.');
		}

		const currentDate = new Date();
		const startDate = new Date(coupon.startDate);
		const endDate = new Date(coupon.endDate);

		if (currentDate < startDate || currentDate > endDate) {
			throw new Error('Coupon is expired or not yet active.');
		}

		// Check Max Uses
		if (coupon.maxUses > 0) {
			const successfulRedemptions = await db.orderGroup.count({
				where: {
					couponId: coupon.id,
					order: { paymentStatus: 'Paid' },
				},
			});

			if (successfulRedemptions >= coupon.maxUses) {
				throw new Error(
					`The coupon "${coupon.code}" has reached its maximum limit of ${coupon.maxUses} uses.`,
				);
			}
		}

		// 3. Find matching OrderGroup by storeId
		const matchingGroup = order.groups.find(
			(g) => g.storeId === coupon.storeId,
		);

		if (!matchingGroup) {
			throw new Error(
				`This coupon is issued by "${coupon.store.name}", but this order contains no items from that store.`,
			);
		}

		if (matchingGroup.couponId === coupon.id) {
			throw new Error('This coupon is already applied to this order.');
		}

		// 4. Recalculate group total with coupon discount
		const storeSubTotal = matchingGroup.subTotal + matchingGroup.shippingFees;
		const discountedAmount = (storeSubTotal * coupon.discount) / 100;
		const newGroupTotal = Math.max(0, storeSubTotal - discountedAmount);

		await db.orderGroup.update({
			where: { id: matchingGroup.id },
			data: {
				couponId: coupon.id,
				total: newGroupTotal,
			},
		});

		// 5. Recalculate main Order total
		const allGroups = await db.orderGroup.findMany({
			where: { orderId: order.id },
		});

		const newOrderTotal = allGroups.reduce((acc, g) => acc + g.total, 0);

		const updatedOrder = await db.order.update({
			where: { id: order.id },
			data: {
				subTotal: order.subTotal,
				shippingFees: order.shippingFees,
				total: newOrderTotal,
			},
			include: {
				groups: {
					include: {
						items: true,
						store: true,
						coupon: true,
					},
				},
				shippingAddress: true,
				paymentDetails: true,
			},
		});

		return {
			message: `Coupon "${coupon.code}" (${coupon.discount}% OFF) applied successfully!`,
			order: updatedOrder,
		};
	} catch (error: any) {
		throw new Error(error.message || 'Failed to apply coupon to order.');
	}
};

// Function: getStoreCoupons
// Description: Retrieves all coupons for a specific store based on the provided store URL.
// Permission Level: Seller only
// Parameters:
//   - storeUrl: String representing the store's unique URL, used to retrieve the store ID.
// Returns: Array of coupon details for the specified store.
export const getStoreCoupons = async (storeUrl: string) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) return [];

		// Ensure storeUrl is provided
		if (!storeUrl) return [];

		// Retrieve store using case-insensitive URL match
		const store = await db.store.findFirst({
			where: {
				url: {
					equals: storeUrl,
					mode: 'insensitive',
				},
			},
		});

		if (!store) return [];

		// Check if user is store owner or admin
		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { role: true },
		});

		const isAdmin =
			user.privateMetadata?.role === 'ADMIN' ||
			user.publicMetadata?.role === 'ADMIN' ||
			dbUser?.role === 'ADMIN';

		const isOwner = store.userId === user.id;

		if (!isAdmin && !isOwner) {
			console.warn(`User ${user.id} unauthorized for store coupons: ${storeUrl}`);
			return [];
		}

		// Retrieve and return all coupons for the specified store with usage stats
		const coupons = await db.coupon.findMany({
			where: {
				storeId: store.id,
			},
			include: {
				orders: {
					where: {
						order: { paymentStatus: 'Paid' },
					},
					select: { id: true },
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		const now = new Date();
		return coupons.map((c) => {
			const usedCount = c.orders.length;
			const startDate = new Date(c.startDate);
			const endDate = new Date(c.endDate);

			let status: 'Active' | 'Expired' | 'Inactive' = 'Active';
			if (now > endDate) {
				status = 'Expired';
			} else if (now < startDate || (c.maxUses > 0 && usedCount >= c.maxUses)) {
				status = 'Inactive';
			}

			return {
				...c,
				usedCount,
				status,
			};
		});
	} catch (error) {
		console.error('getStoreCoupons error:', error);
		return [];
	}
};

// Function: getCoupon
// Description: Retrieves a specific coupon from the database.
// Access Level: Public
// Parameters:
//   - couponId: The ID of the coupon to be retrieved.
// Returns: Details of the requested coupon.
export const getCoupon = async (couponId: string) => {
	try {
		// Ensure coupon ID is provided
		if (!couponId) throw new Error("Please provide coupon ID.");

		// Retrieve coupon
		const coupon = await db.coupon.findUnique({
			where: {
				id: couponId,
			},
		});

		return coupon;
	} catch (error) {
		throw error;
	}
};

// Function: deleteCoupon
// Description: Deletes a coupon from the database.
// Permission Level: Seller only (must be the store owner)
// Parameters:
//   - couponId: The ID of the coupon to be deleted.
//   - storeUrl: The URL of the store associated with the coupon.
// Returns: Response indicating success or failure of the deletion operation.

export const deleteCoupon = async (couponId: string, storeUrl: string) => {
	try {
		// Get current user
		const user = await currentUser();

		// Check if user is authenticated
		if (!user) throw new Error("Unauthenticated.");

		// Verify seller permission
		if (user.privateMetadata.role !== "SELLER")
			throw new Error("Unauthorized Access: Seller Privileges Required.");

		// Ensure coupon ID and store URL are provided
		if (!couponId || !storeUrl)
			throw new Error("Please provide coupon ID and store URL.");

		// Get the store associated with the provided store URL
		const store = await db.store.findUnique({
			where: {
				url: storeUrl,
			},
		});

		// Verify store exists
		if (!store) throw new Error("Store not found.");

		// Verify that the logged-in user is the owner of the store
		if (store.userId !== user.id) {
			throw new Error(
				"You are not the owner of this store. Only the store owner can delete coupons."
			);
		}

		// Delete the coupon from the database
		const response = await db.coupon.delete({
			where: {
				id: couponId,
				storeId: store.id,
			},
		});

		return response;
	} catch (error) {
		throw error;
	}
};

export const getAllAdminCoupons = async ({
	page = 1,
	limit = 10,
	search = '',
}: {
	page?: number;
	limit?: number;
	search?: string;
} = {}) => {
	try {
		const user = await currentUser();
		if (!user || user.privateMetadata.role !== 'ADMIN') {
			throw new Error('Unauthorized Access: Admin privileges required.');
		}

		const skip = Math.max(0, (page - 1) * limit);

		const where = search.trim()
			? {
				OR: [
					{ code: { contains: search.trim(), mode: 'insensitive' as const } },
					{ store: { name: { contains: search.trim(), mode: 'insensitive' as const } } },
				],
			}
			: {};

		const [coupons, totalCount] = await Promise.all([
			db.coupon.findMany({
				where,
				include: {
					store: {
						select: {
							id: true,
							name: true,
							url: true,
						},
					},
					_count: {
						select: {
							orders: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take: limit,
			}),
			db.coupon.count({ where }),
		]);

		return {
			coupons,
			totalCount,
			totalPages: Math.ceil(totalCount / limit) || 1,
			page,
			limit,
		};
	} catch (error) {
		throw error;
	}
};

export const deleteAdminCoupon = async (couponId: string) => {
	try {
		const user = await currentUser();
		if (!user || user.privateMetadata.role !== 'ADMIN') {
			throw new Error('Unauthorized Access: Admin privileges required.');
		}

		if (!couponId) throw new Error('Please provide a valid coupon ID.');

		return await db.coupon.delete({
			where: { id: couponId },
		});
	} catch (error) {
		throw error;
	}
};
