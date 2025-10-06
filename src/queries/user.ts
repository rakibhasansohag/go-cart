'use server';

import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { CartProductType } from '@/lib/types';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';
import { getShippingDetails } from './product';

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

		// Check if the user is already following the store
		const userFollowingStore = await db.user.findFirst({
			where: {
				id: user.id,
				following: {
					some: {
						id: storeId,
					},
				},
			},
		});

		if (userFollowingStore) {
			// Unfollow the store and return false
			await db.store.update({
				where: {
					id: storeId,
				},
				data: {
					followers: {
						disconnect: { id: userData.id },
					},
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
					followers: {
						connect: {
							id: userData.id,
						},
					},
				},
			});
			return true;
		}
	} catch (error) {
		throw error;
	}
};

/*
 * Function: saveUserCart
 * Description: Saves the user's cart by validating product data from the database and ensuring no frontend manipulation.
 * Permission Level: User who owns the cart
 * Parameters:
 *   - cartProducts: An array of product objects from the frontend cart.
 * Returns:
 *   - An object containing the updated cart with recalculated total price and validated product data.
 */
export const saveUserCart = async (
	cartProducts: CartProductType[],
): Promise<boolean> => {
	// Get current user
	const user = await currentUser();

	// Ensure user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	const userId = user.id;

	// Search for existing user cart
	const userCart = await db.cart.findFirst({
		where: { userId },
	});

	// Delete any existing user cart
	if (userCart) {
		await db.cart.delete({
			where: {
				userId,
			},
		});
	}

	// Fetch product, variant, and size data from the database for validation
	const validatedCartItems = await Promise.all(
		cartProducts.map(async (cartProduct) => {
			const { productId, variantId, sizeId, quantity } = cartProduct;

			// Fetch the product, variant, and size from the database
			const product = await db.product.findUnique({
				where: {
					id: productId,
				},
				include: {
					store: true,
					freeShipping: {
						include: {
							eligibaleCountries: true,
						},
					},
					variants: {
						where: {
							id: variantId,
						},
						include: {
							sizes: {
								where: {
									id: sizeId,
								},
							},
							images: true,
						},
					},
				},
			});

			if (
				!product ||
				product.variants.length === 0 ||
				product.variants[0].sizes.length === 0
			) {
				throw new Error(
					`Invalid product, variant, or size combination for productId ${productId}, variantId ${variantId}, sizeId ${sizeId}`,
				);
			}

			const variant = product.variants[0];
			const size = variant.sizes[0];

			// Validate stock and price
			const validQuantity = Math.min(quantity, size.quantity);

			const price = size.discount
				? size.price - size.price * (size.discount / 100)
				: size.price;

			// Calculate Shipping details
			const countryCookie = await getCookie('userCountry', { cookies });

			let details = {
				shippingFee: 0,
				extraShippingFee: 0,
				isFreeShipping: false,
			};

			if (countryCookie) {
				const country = JSON.parse(countryCookie);
				const temp_details = await getShippingDetails(
					product.shippingFeeMethod,
					country,
					product.store,
					product.freeShipping,
				);
				if (typeof temp_details !== 'boolean') {
					details = temp_details;
				}
			}
			let shippingFee = 0;
			const { shippingFeeMethod } = product;
			if (shippingFeeMethod === 'ITEM') {
				shippingFee =
					quantity === 1
						? details.shippingFee
						: details.shippingFee + details.extraShippingFee * (quantity - 1);
			} else if (shippingFeeMethod === 'WEIGHT') {
				shippingFee = details.shippingFee * variant.weight * quantity;
			} else if (shippingFeeMethod === 'FIXED') {
				shippingFee = details.shippingFee;
			}

			const totalPrice = price * validQuantity + shippingFee;
			return {
				productId,
				variantId,
				productSlug: product.slug,
				variantSlug: variant.slug,
				sizeId,
				storeId: product.storeId,
				sku: variant.sku,
				name: `${product.name} · ${variant.variantName}`,
				image: variant.images[0].url,
				size: size.size,
				quantity: validQuantity,
				price,
				shippingFee,
				totalPrice,
			};
		}),
	);

	// Recalculate the cart's total price and shipping fees
	const subTotal = validatedCartItems.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0,
	);

	const shippingFees = validatedCartItems.reduce(
		(acc, item) => acc + item.shippingFee,
		0,
	);

	const total = subTotal + shippingFees;

	// Save the validated items to the cart in the database
	const cart = await db.cart.create({
		data: {
			cartItems: {
				create: validatedCartItems.map((item) => ({
					productId: item.productId,
					variantId: item.variantId,
					sizeId: item.sizeId,
					storeId: item.storeId,
					sku: item.sku,
					productSlug: item.productSlug,
					variantSlug: item.variantSlug,
					name: item.name,
					image: item.image,
					quantity: item.quantity,
					size: item.size,
					price: item.price,
					shippingFee: item.shippingFee,
					totalPrice: item.totalPrice,
				})),
			},
			shippingFees,
			subTotal,
			total,
			userId,
		},
	});
	if (cart) return true;
	return false;
};

/*
 * Function: updateCartWithLatest
 * Description: Keeps the cart updated with latest info (price,qty,shipping fee...).
 * Permission Level: Public
 * Parameters:
 *   - cartProducts: An array of product objects from the frontend cart.
 * Returns:
 *   - An object containing the updated cart with recalculated total price and validated product data.
 */
export const updateCartWithLatest = async (
	cartProducts: CartProductType[],
): Promise<CartProductType[]> => {
	// Fetch product, variant, and size data from the database for validation
	const validatedCartItems = await Promise.all(
		cartProducts.map(async (cartProduct) => {
			const { productId, variantId, sizeId, quantity } = cartProduct;

			// Fetch the product, variant, and size from the database
			const product = await db.product.findUnique({
				where: {
					id: productId,
				},
				include: {
					store: true,
					freeShipping: {
						include: {
							eligibaleCountries: true,
						},
					},
					variants: {
						where: {
							id: variantId,
						},
						include: {
							sizes: {
								where: {
									id: sizeId,
								},
							},
							images: true,
						},
					},
				},
			});

			if (
				!product ||
				product.variants.length === 0 ||
				product.variants[0].sizes.length === 0
			) {
				throw new Error(
					`Invalid product, variant, or size combination for productId ${productId}, variantId ${variantId}, sizeId ${sizeId}`,
				);
			}

			const variant = product.variants[0];
			const size = variant.sizes[0];

			// Calculate Shipping details
			const countryCookie = await getCookie('userCountry', { cookies });

			let details = {
				shippingService: product.store.defaultShippingService,
				shippingFee: 0,
				extraShippingFee: 0,
				isFreeShipping: false,
				deliveryTimeMin: 0,
				deliveryTimeMax: 0,
			};

			if (countryCookie) {
				const country = JSON.parse(countryCookie);
				const temp_details = await getShippingDetails(
					product.shippingFeeMethod,
					country,
					product.store,
					product.freeShipping,
				);

				if (typeof temp_details !== 'boolean') {
					details = temp_details;
				}
			}

			const price = size.discount
				? size.price - (size.price * size.discount) / 100
				: size.price;

			const validated_qty = Math.min(quantity, size.quantity);

			return {
				productId,
				variantId,
				productSlug: product.slug,
				variantSlug: variant.slug,
				sizeId,
				sku: variant.sku,
				name: product.name,
				variantName: variant.variantName,
				image: variant.images[0].url,
				variantImage: variant.variantImage,
				stock: size.quantity,
				weight: variant.weight,
				shippingMethod: product.shippingFeeMethod,
				size: size.size,
				quantity: validated_qty,
				price,
				shippingService: details.shippingService,
				shippingFee: details.shippingFee,
				extraShippingFee: details.extraShippingFee,
				deliveryTimeMin: details.deliveryTimeMin,
				deliveryTimeMax: details.deliveryTimeMax,
				isFreeShipping: details.isFreeShipping,
			};
		}),
	);
	return validatedCartItems;
};


// Function: getUserShippingAddresses
// Description: Retrieves all shipping addresses for a specific user.
// Permission Level: User who owns the addresses
// Parameters: None
// Returns: List of shipping addresses for the user.
export const getUserShippingAddresses = async () => {
  try {
    // Get current user
    const user = await currentUser();

    // Ensure user is authenticated
    if (!user) throw new Error("Unauthenticated.");

    // Retrieve all shipping addresses for the specified user
    const shippingAddresses = await db.shippingAddress.findMany({
      where: {
        userId: user.id,
      },
      include: {
        country: true,
        user: true,
      },
    });

    return shippingAddresses;
  } catch (error) {
    // Log and re-throw any errors
    throw error;
  }
};
