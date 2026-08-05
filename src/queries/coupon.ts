'use server';

import { CartWithCartItemsType } from '@/lib/types';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { v4 } from 'uuid';
import { CouponFormSchema } from '@/lib/schemas';

type SellerCouponInput = {
	id?: string;
	code: string;
	discount: number;
	maxUses?: number;
	maxUsesPerUser?: number;
	startDate: string;
	endDate: string;
};

export const upsertCoupon = async (coupon: SellerCouponInput, storeUrl: string) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Ensure coupon data and storeUrl are provided
		if (!coupon) throw new Error('Please provide coupon data.');
		if (!storeUrl) throw new Error('Store URL is required.');
		const parsedCoupon = CouponFormSchema.parse(coupon);
		const cleanCode = parsedCoupon.code.trim().toUpperCase();

		// Retrieve store ID using storeUrl
		const store = await db.store.findFirst({
			where: { url: { equals: storeUrl, mode: 'insensitive' } },
		});

		if (!store) throw new Error('Store not found.');

		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { role: true },
		});
		const isAdmin =
			user.privateMetadata?.role === 'ADMIN' ||
			user.publicMetadata?.role === 'ADMIN' ||
			dbUser?.role === 'ADMIN';

		if (!isAdmin && store.userId !== user.id) {
			throw new Error('Unauthorized: You do not own this store.');
		}

		const couponId = coupon.id || v4();
		const existingById = await db.coupon.findUnique({
			where: { id: couponId },
			select: { storeId: true },
		});
		if (existingById && existingById.storeId !== store.id) {
			throw new Error('Unauthorized: Coupon belongs to another store.');
		}

		// Coupon codes are globally unique and matched case-insensitively.
		const existingCoupon = await db.coupon.findFirst({
			where: {
				code: { equals: cleanCode, mode: 'insensitive' },
				NOT: { id: couponId },
			},
		});

		if (existingCoupon) {
			throw new Error(`A coupon with code "${cleanCode}" already exists.`);
		}

		const payload = {
			code: cleanCode,
			startDate: parsedCoupon.startDate,
			endDate: parsedCoupon.endDate,
			discount: parsedCoupon.discount,
			maxUses: parsedCoupon.maxUses,
			maxUsesPerUser: parsedCoupon.maxUsesPerUser,
			storeId: store.id,
		};

		const couponDetails = existingById
			? await db.coupon.update({ where: { id: couponId }, data: payload })
			: await db.coupon.create({ data: { id: couponId, ...payload } });

		return couponDetails;
	} catch (error) {
		throw error;
	}
};

export const validateCouponCode = async (code: string) => {
	try {
		const cleanCode = code.toUpperCase().trim();
		const coupon = await db.coupon.findFirst({
			where: { code: { equals: cleanCode, mode: 'insensitive' } },
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

		// Verify per-customer max usage limit
		const user = await currentUser();
		if (user) {
			const userRedemptions = await db.orderGroup.count({
				where: {
					couponId: coupon.id,
					order: {
						userId: user.id,
						paymentStatus: 'Paid',
					},
				},
			});

			const maxPerUser = coupon.maxUsesPerUser ?? 1;
			if (maxPerUser > 0 && userRedemptions >= maxPerUser) {
				const limitText = maxPerUser === 1 ? 'one time' : `${maxPerUser} times`;
				throw new Error(
					`Sorry, this discount code can only be used ${limitText} per customer.`,
				);
			}
		}

		return {
			id: coupon.id,
			code: coupon.code,
			discount: coupon.discount,
			storeId: coupon.storeId,
			storeName: coupon.store?.name || 'Global Platform',
			maxUses: coupon.maxUses,
			usedCount: successfulRedemptions,
		};
	} catch (error: unknown) {
		throw new Error(
			error instanceof Error ? error.message : 'Failed to validate coupon code.',
		);
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
		const cleanCode = couponCode.trim().toUpperCase();

		// Step 1: Fetch the coupon details
		const coupon = await db.coupon.findFirst({
			where: { code: { equals: cleanCode, mode: 'insensitive' } },
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

		// Step 5: Check if Global Platform Coupon or Store-specific Coupon
		let targetItems = cart.cartItems;
		if (coupon.storeId) {
			targetItems = cart.cartItems.filter(
				(item) => item.storeId === coupon.storeId,
			);

			if (targetItems.length === 0) {
				throw new Error(
					`This coupon is issued by "${coupon.store?.name || 'a specific store'}", but your cart contains no items from this store.`,
				);
			}
		}

		// Step 6: Calculate the discount
		const targetSubTotal = targetItems.reduce(
			(acc, item) => acc + item.price * item.quantity,
			0,
		);

		const targetShippingTotal = targetItems.reduce(
			(acc, item) => acc + item.shippingFee,
			0,
		);

		const targetTotal = targetSubTotal + targetShippingTotal;
		const discountedAmount = (targetTotal * coupon.discount) / 100;
		const newTotal = Math.max(0, cart.total - discountedAmount);

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

		const scopeLabel = coupon.store
			? `items from ${coupon.store.name}`
			: 'your entire order';

		return {
			message: `Coupon "${coupon.code}" (${coupon.discount}% OFF) applied successfully to ${scopeLabel}!`,
			cart: updatedCart,
		};
	} catch (error) {
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

		// 3. Apply discount to target order groups (all groups if global coupon, store-specific group if store coupon)
		let targetGroups = order.groups;
		if (coupon.storeId) {
			targetGroups = order.groups.filter((g) => g.storeId === coupon.storeId);
			if (targetGroups.length === 0) {
				throw new Error(
					`This coupon is issued by "${coupon.store?.name || 'a specific store'}", but this order contains no items from that store.`,
				);
			}
		}

		for (const matchingGroup of targetGroups) {
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
		}

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
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to apply coupon to order.';
		throw new Error(message);
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

export const getFeaturedCoupon = async () => {
	try {
		// Priority 1: Global Platform Coupon (storeId is null)
		const globalCoupon = await db.coupon.findFirst({
			where: {
				storeId: null,
			},
			orderBy: { discount: 'desc' },
		});

		if (globalCoupon) return globalCoupon;

		// Priority 2: Highest discount Store Coupon
		const storeCoupon = await db.coupon.findFirst({
			orderBy: { discount: 'desc' },
		});

		return storeCoupon || null;
	} catch (error) {
		console.error('getFeaturedCoupon error:', error);
		return null;
	}
};

export const upsertAdminCoupon = async (couponData: {
	id?: string;
	code: string;
	discount: number;
	maxUses?: number;
	maxUsesPerUser?: number;
	startDate: string;
	endDate: string;
	storeId?: string | null;
}) => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { role: true },
		});

		const isAdmin =
			user.privateMetadata?.role === 'ADMIN' ||
			user.publicMetadata?.role === 'ADMIN' ||
			dbUser?.role === 'ADMIN';

		if (!isAdmin) {
			throw new Error('Unauthorized Access: Admin privileges required.');
		}

		if (!couponData.code) throw new Error('Please provide a coupon code.');

		const cleanCode = couponData.code.trim().toUpperCase();

		const existing = await db.coupon.findFirst({
			where: {
				code: cleanCode,
				...(couponData.id ? { NOT: { id: couponData.id } } : {}),
			},
		});

		if (existing) {
			throw new Error(`A coupon with code "${cleanCode}" already exists.`);
		}

		const couponId = couponData.id || v4();

		const existingById = await db.coupon.findUnique({
			where: { id: couponId },
		});

		const payload = {
			code: cleanCode,
			discount: Number(couponData.discount),
			maxUses: Number(couponData.maxUses ?? 0),
			maxUsesPerUser: Number(couponData.maxUsesPerUser ?? 1),
			startDate: couponData.startDate,
			endDate: couponData.endDate,
			storeId: couponData.storeId || null,
		};

		if (existingById) {
			return await db.coupon.update({
				where: { id: couponId },
				data: payload,
			});
		} else {
			return await db.coupon.create({
				data: {
					id: couponId,
					...payload,
				},
			});
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save admin coupon.';
		throw new Error(message);
	}
};
