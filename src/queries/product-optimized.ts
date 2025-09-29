/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { getRatingStatistics } from './product';

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
					reviews: true, // Include the count of reviews wen we added the reviews collection to the product
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

/**
 *
 * @param productId
 * @param categoryId
 * @param subCategoryId
 * @returns
 */

export const getRelatedProducts = async (
	productId: string,
	categoryId: string,
	subCategoryId: string,
) => {
	// Fetch up to 6 products in the given subcategory first
	const subCategoryProducts = await db.product.findMany({
		where: {
			subCategoryId: subCategoryId,
			categoryId: categoryId,
			id: {
				not: productId,
			},
		},
		include: {
			variants: {
				include: {
					sizes: true,
					images: {
						orderBy: {
							order: 'asc',
						},
					},
					colors: true,
				},
			},
		},
		take: 6, // Limit to 6 products from the subcategory
	});

	// If there are less than 6 products in the subcategory, fetch additional products from the category
	let relatedProducts = subCategoryProducts;

	if (relatedProducts.length < 6) {
		// Fetch additional products from the category (excluding those already fetched from the subcategory)
		const remainingCount = 6 - relatedProducts.length;
		const categoryProducts = await db.product.findMany({
			where: {
				categoryId: categoryId,
				id: {
					notIn: [
						productId, // Exclude the main product
						...relatedProducts.map((product) => product.id), // Exclude already fetched products
					],
				},
			},
			take: remainingCount, // Fetch only the remaining number of products
			include: {
				variants: {
					include: {
						sizes: true,
						images: {
							orderBy: {
								order: 'asc',
							},
						},
						colors: true,
					},
				},
			},
		});

		// Add the category products to the related products array
		relatedProducts = [...relatedProducts, ...categoryProducts];
	}

	// Transform the products into the required structure for ProductCardType
	const productsWithFilteredVariants = relatedProducts.map((product) => {
		// Filter the variants based on the filters (no filters in this case)
		const filteredVariants = product.variants;

		// Transform the filtered variants into the VariantSimplified structure
		const variants: VariantSimplified[] = filteredVariants.map((variant) => ({
			variantId: variant.id,
			variantSlug: variant.slug,
			variantName: variant.variantName,
			images: variant.images,
			sizes: variant.sizes,
		}));

		// Extract variant images for the product
		const variantImages: VariantImageType[] = filteredVariants.map(
			(variant) => ({
				url: `/product/${product.slug}/${variant.slug}`,
				image: variant.variantImage
					? variant.variantImage
					: variant.images[0].url,
			}),
		);

		// Return the product in the ProductCardType structure
		return {
			id: product.id,
			slug: product.slug,
			name: product.name,
			rating: product.rating,
			sales: product.sales,
			numReviews: product.numReviews,
			variants,
			variantImages,
		};
	});

	// Return the related products (up to 6)
	return productsWithFilteredVariants.slice(0, 6);
};

// Function: getProductFilteredReviews
// Description: Retrieves filtered and sorted reviews for a product from the database, based on rating, presence of images, and sorting options.
// Access Level: Public
// Parameters:
//   - productId: The ID of the product for which reviews are being fetched.
//   - filters: An object containing the filter options such as rating and whether reviews include images.
//   - sort: An object defining the sort order, such as latest, oldest, or highest rating.
//   - page: The page number for pagination (1-based index).
//   - pageSize: The number of reviews to retrieve per page.
// Returns: A paginated list of reviews that match the filter and sort criteria.
// export const getProductFilteredReviews = async (
// 	productId: string,
// 	filters: { rating?: number; hasImages?: boolean },
// 	sort: { orderBy: 'latest' | 'oldest' | 'highest' } | undefined,
// 	page: number = 1,
// 	pageSize: number = 4,
// ) => {
// 	const reviewFilter: any = {
// 		productId,
// 	};

// 	// Apply rating filter if provided
// 	if (filters.rating) {
// 		const rating = filters.rating;
// 		reviewFilter.rating = {
// 			in: [rating, rating + 0.5],
// 		};
// 	}

// 	// Apply image filter if provided
// 	if (filters.hasImages) {
// 		reviewFilter.images = {
// 			some: {},
// 		};
// 	}

// 	// Set sorting order using local SortOrder type
// 	const sortOption: { createdAt?: SortOrder; rating?: SortOrder } =
// 		sort && sort.orderBy === 'latest'
// 			? { createdAt: 'desc' }
// 			: sort && sort.orderBy === 'oldest'
// 			? { createdAt: 'asc' }
// 			: { rating: 'desc' };

// 	// Calculate pagination parameters
// 	const skip = (page - 1) * pageSize;
// 	const take = pageSize;

// 	const statistics = await getRatingStatistics(productId);
// 	// Fetch reviews from the database
// 	const reviews = await db.review.findMany({
// 		where: reviewFilter,
// 		include: {
// 			images: true,
// 			user: true,
// 		},
// 		orderBy: sortOption,
// 		skip, // Skip records for pagination
// 		take, // Take records for pagination
// 	});

// 	return { reviews, statistics };
// };

export const getProductFilteredReviews = async (
  productId: string,
  filters: { rating?: number; hasImages?: boolean },
  sort: { orderBy: 'latest' | 'oldest' | 'highest' } | undefined,
  page: number = 1,
  pageSize: number = 4,
) => {
  const reviewFilter: any = { productId };

  if (filters.rating) {
    const rating = filters.rating;
    reviewFilter.rating = { in: [rating, rating + 0.5] };
  }

  if (filters.hasImages) {
    reviewFilter.images = { some: {} };
  }

 	const sortOption: { createdAt?: SortOrder; rating?: SortOrder } =
		sort && sort.orderBy === 'latest'
			? { createdAt: 'desc' }
			: sort && sort.orderBy === 'oldest'
			? { createdAt: 'asc' }
			: { rating: 'desc' };

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // statistics for UI 
  const stats = await getRatingStatistics(productId);

  // total count matching the filter 
  const totalReviews = await db.review.count({
    where: reviewFilter,
  });

  const reviews = await db.review.findMany({
    where: reviewFilter,
    include: { images: true, user: true },
    orderBy: sortOption,
    skip,
    take,
  });

  // return reviews + statistics + filtered total count
  return {
    reviews,
    statistics: {
      ...stats,
      totalReviews, // filtered total so client can compute pages correctly
    },
  };
};
