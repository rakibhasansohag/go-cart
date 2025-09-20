'use server';

import { db } from '@/lib/db';

import {
	FreeShippingWithCountriesType,
	SortOrder,
	VariantImageType,
	VariantSimplified,
} from '@/lib/types';

import { currentUser } from '@clerk/nextjs/server';
import { Store } from '@prisma/client';

/**
 * Retrieves optimized product details by product slug.
 * @param productSlug - The slug of the product to retrieve.
 * @returns An object containing product name, slug, rating, and variants.
 */
export const retrieveProductDetailsOptimized = async (productSlug: string) => {
	console.log('productSlug', productSlug);
	// Fetch the product details from the database
	const product = await db.product.findUnique({
		where: { slug: productSlug },
		select: {
			id: true,
			name: true,
			slug: true,
			rating: true,
			numReviews: true,
			description: true,
			specs: true,
			questions: true,
			categoryId: true,
			subCategoryId: true,
			shippingFeeMethod: true,
			freeShippingForAllCountries: true,
			_count: {
				select: {
					// reviews: true, // Include the count of reviews wen we added the reviews collection to the product
				},
			},
			freeShipping: {
				include: {
					eligibaleCountries: {
						include: {
							country: true,
						},
					},
				},
			},
			variants: {
				select: {
					id: true,
					variantName: true,
					variantImage: true,
					weight: true,
					slug: true,
					sku: true,
					isSale: true,
					saleEndDate: true,
					variantDescription: true,
					keywords: true,
					specs: true,
					images: {
						select: {
							url: true,
						},
						orderBy: {
							order: 'asc',
						},
					},
					sizes: true,
					colors: {
						select: {
							name: true,
						},
					},
				},
			},
			store: true,
		},
	});

	if (!product) {
		throw new Error('Product not found');
	}

	// Return the structured product details
	return product;
};

export const getStoreFollowingInfo = async (storeId: string) => {
	const user = await currentUser();
	let isUserFollowingStore = false;
	if (user) {
		const storeFollowersInfo = await db.store.findUnique({
			where: {
				id: storeId,
			},
			select: {
				followers: {
					where: {
						id: user.id, // Check if this user is following the store
					},
					select: { id: true }, // Select the user id if following
				},
			},
		});
		if (storeFollowersInfo && storeFollowersInfo.followers.length > 0) {
			isUserFollowingStore = true;
		}
	}

	const storeFollowersInfo = await db.store.findUnique({
		where: {
			id: storeId,
		},
		select: {
			_count: {
				select: {
					followers: true,
				},
			},
		},
	});

	return {
		isUserFollowingStore,
		followersCount: storeFollowersInfo
			? storeFollowersInfo._count.followers
			: 0,
	};
};

// Function: getShippingDetails
// Description: Retrieves and calculates shipping details based on user country and product.
// Access Level: Public
// Parameters:
//   - shippingFeeMethod: The shipping fee method of the product.
//   - userCountry: The parsed user country object from cookies.
//   - store : store details.
// Returns: Calculated shipping details.
export const getShippingDetails = async (
	shippingFeeMethod: string,
	userCountry: { name: string; code: string; city: string },
	store: Store,
	freeShipping: FreeShippingWithCountriesType | null,
	freeShippingForAllCountries: boolean,
) => {
	// Default shipping details
	let shippingDetails = {
		shippingFeeMethod,
		shippingService: '',
		shippingFee: 0,
		extraShippingFee: 0,
		deliveryTimeMin: 0,
		deliveryTimeMax: 0,
		returnPolicy: '',
		countryCode: userCountry.code,
		countryName: userCountry.name,
		city: userCountry.city,
		isFreeShipping: false,
	};

	const country = await db.country.findUnique({
		where: {
			name: userCountry.name,
			code: userCountry.code,
		},
	});

	if (country) {
		// Retrieve shipping rate for the country
		const shippingRate = await db.shippingRate.findFirst({
			where: {
				countryId: country.id,
				storeId: store.id,
			},
		});

		// Extract shipping details
		const returnPolicy = shippingRate?.returnPolicy || store.returnPolicy;
		const shippingService =
			shippingRate?.shippingService || store.defaultShippingService;
		const deliveryTimeMin =
			shippingRate?.deliveryTimeMin || store.defaultDeliveryTimeMin;
		const deliveryTimeMax =
			shippingRate?.deliveryTimeMax || store.defaultDeliveryTimeMax;

		// Check for free shipping
		let isFreeShipping = false;
		if (freeShippingForAllCountries === true) {
			isFreeShipping = true;
		} else if (freeShipping) {
			const eligibleCountries = freeShipping.eligibaleCountries;
			isFreeShipping = eligibleCountries.some(
				(c) => c.countryId === country.id,
			);
		}

		shippingDetails = {
			shippingFeeMethod,
			shippingService,
			shippingFee: 0,
			extraShippingFee: 0,
			deliveryTimeMin,
			deliveryTimeMax,
			returnPolicy,
			countryCode: userCountry.code,
			countryName: userCountry.name,
			city: userCountry.city,
			isFreeShipping,
		};

		// Determine shipping fees based on method
		const shippingFeePerItem =
			shippingRate?.shippingFeePerItem || store.defaultShippingFeePerItem;
		const shippingFeeForAdditionalItem =
			shippingRate?.shippingFeeForAdditionalItem ||
			store.defaultShippingFeeForAdditionalItem;
		const shippingFeePerKg =
			shippingRate?.shippingFeePerKg || store.defaultShippingFeePerKg;
		const shippingFeeFixed =
			shippingRate?.shippingFeeFixed || store.defaultShippingFeeFixed;

		if (!isFreeShipping) {
			switch (shippingFeeMethod) {
				case 'ITEM':
					shippingDetails.shippingFee = shippingFeePerItem;
					shippingDetails.extraShippingFee = shippingFeeForAdditionalItem;
					break;

				case 'WEIGHT':
					shippingDetails.shippingFee = shippingFeePerKg;
					break;

				case 'FIXED':
					shippingDetails.shippingFee = shippingFeeFixed;
					break;

				default:
					break;
			}
		}

		return shippingDetails;
	}

	// Default values if country is not found
	return {
		shippingFeeMethod,
		shippingService: store.defaultShippingService || 'International Delivery',
		shippingFee: 0,
		extraShippingFee: 0,
		deliveryTimeMin: store.defaultDeliveryTimeMin || 0,
		deliveryTimeMax: store.defaultDeliveryTimeMax || 0,
		returnPolicy:
			store.returnPolicy ||
			'We understand things don’t always work out. You can return this item within 30 days of delivery for a full refund or exchange. Please ensure the item is in its original condition.',
		countryCode: userCountry.code,
		countryName: userCountry.name,
		city: userCountry.city,
		isFreeShipping: freeShippingForAllCountries,
	};
};
