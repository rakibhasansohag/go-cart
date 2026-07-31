'use server';

import { currentUser } from '@clerk/nextjs/server';
import { OrderStatus, Prisma, ShippingRate, Store } from '@prisma/client';
import { db } from '@/lib/db';
import { StoreDefaultShippingType, StoreStatus, StoreType } from '@/lib/types';
import { checkIfUserFollowingStore } from './product';
import { normalizeCommerceReference } from '@/lib/orders/references';

// Point:   Function: upsertStore
// Description: Upserts store details into the database, ensuring uniqueness of name,url, email, and phone number.
// Access Level: Seller Only
// Parameters:
//   - store: Partial store object containing details of the store to be upserted.
// Returns: Updated or newly created store details.
export const upsertStore = async (store: Partial<Store>) => {
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

		// If store.id exists, we are updating an existing store
		if (store.id) {
			const existingStoreById = await db.store.findUnique({
				where: { id: store.id },
			});

			if (existingStoreById) {
				// Server-side Guard: Email and Store URL are immutable once created.
				// Strip email and url from update payload so they can never be modified.
				const updateData = { ...store };
				delete updateData.email;
				delete updateData.url;
				delete updateData.createdAt;
				delete updateData.updatedAt;

				const storeDetails = await db.store.update({
					where: { id: store.id },
					data: {
						...updateData,
						updatedAt: new Date(),
					},
				});

				return storeDetails;
			}
		}

		// Creating a new store
		// Check if store with same name, email, url, or phone number already exists
		const existingStore = await db.store.findFirst({
			where: {
				OR: [
					{ name: store.name },
					{ email: store.email },
					{ phone: store.phone },
					{ url: store.url },
				],
			},
		});

		// If a store with same name, email, or phone number already exists, throw an error
		if (existingStore) {
			let errorMessage = '';
			if (existingStore.name === store.name) {
				errorMessage = 'A store with the same name already exists';
			} else if (existingStore.email === store.email) {
				errorMessage = 'A store with the same email already exists';
			} else if (existingStore.phone === store.phone) {
				errorMessage = 'A store with the same phone number already exists';
			} else if (existingStore.url === store.url) {
				errorMessage = 'A store with the same URL already exists';
			}
			throw new Error(errorMessage);
		}

		// Create new store
		const storeDetails = await db.store.create({
			data: {
				id: store.id,
				name: store.name!,
				description: store.description!,
				email: store.email!,
				phone: store.phone!,
				url: store.url!,
				logo: store.logo!,
				cover: store.cover!,
				featured: store.featured ?? false,
				createdAt: store.createdAt ?? new Date(),
				updatedAt: store.updatedAt ?? new Date(),
				user: {
					connect: { id: user.id },
				},
			},
		});

		console.log(storeDetails);

		return storeDetails;
	} catch (error) {
		console.log(error);
		throw error;
	}
};

// Point: Function: getStoreDefaultShippingDetails
// Description: Fetches the default shipping details for a store based on the store URL.
// Parameters:
//   - storeUrl: The URL of the store to fetch default shipping details for.
// Returns: An object containing default shipping details, including shipping service, fees, delivery times, and return policy.
export const getStoreDefaultShippingDetails = async (storeUrl: string) => {
	try {
		// Ensure the store URL is provided
		if (!storeUrl) throw new Error('Store URL is required.');

		// Fetch the store and its default shipping details
		const store = await db.store.findUnique({
			where: {
				url: storeUrl,
			},
			select: {
				id: true,
				defaultShippingService: true,
				defaultShippingFeePerItem: true,
				defaultShippingFeeForAdditionalItem: true,
				defaultShippingFeePerKg: true,
				defaultShippingFeeFixed: true,
				defaultDeliveryTimeMin: true,
				defaultDeliveryTimeMax: true,
				returnPolicy: true,
			},
		});

		// Throw an error if the store is not found
		if (!store) throw new Error('Store not found.');

		return store;
	} catch (error) {
		// Log and re-throw any errors
		throw error;
	}
};

// Point: Function: updateStoreDefaultShippingDetails
// Description: Updates the default shipping details for a store based on the store URL.
// Parameters:
//   - storeUrl: The URL of the store to update.
//   - details: An object containing the new shipping details (shipping service, fees, delivery times, and return policy).
// Returns: The updated store object with the new default shipping details.
export const updateStoreDefaultShippingDetails = async (
	storeUrl: string,
	details: StoreDefaultShippingType,
) => {
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

		// Ensure the store URL is provided
		if (!storeUrl) throw new Error('Store URL is required.');

		// Ensure at least one detail is provided for update
		if (!details) {
			throw new Error('No shipping details provided to update.');
		}
		// Make sure seller is updating their own store
		const check_ownership = await db.store.findUnique({
			where: {
				url: storeUrl,
				userId: user.id,
			},
		});

		if (!check_ownership)
			throw new Error(
				'Make sure you have the permissions to update this store',
			);

		// Find and update the store based on storeUrl
		const updatedStore = await db.store.update({
			where: {
				url: storeUrl,
				userId: user.id,
			},
			data: details,
		});

		return updatedStore;
	} catch (error) {
		// Log and re-throw any errors
		throw error;
	}
};

/**
 * Point: Function: getStoreShippingRates
 * Description: Retrieves all countries and their shipping rates for a specific store.
 *              If a country does not have a shipping rate, it is still included in the result with a null shippingRate.
 * Permission Level: Public
 * Returns: Array of objects where each object contains a country and its associated shippingRate, sorted by country name.
 */
export const getStoreShippingRates = async (storeUrl: string) => {
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

		// Ensure the store URL is provided
		if (!storeUrl) throw new Error('Store URL is required.');

		// Make sure seller is updating their own store
		const check_ownership = await db.store.findUnique({
			where: {
				url: storeUrl,
				userId: user.id,
			},
		});

		if (!check_ownership)
			throw new Error(
				'Make sure you have the permissions to update this store',
			);

		// Get store details
		const store = await db.store.findUnique({
			where: { url: storeUrl, userId: user.id },
		});

		if (!store) throw new Error('Store could not be found.');

		// Retrieve all countries
		const countries = await db.country.findMany({
			orderBy: {
				name: 'asc',
			},
		});

		// Retrieve all shipping rates for the specified store
		const shippingRates = await db.shippingRate.findMany({
			where: {
				storeId: store.id,
			},
		});

		// Create a map for quick lookup of shipping rates by country ID
		const rateMap = new Map();
		shippingRates.forEach((rate) => {
			rateMap.set(rate.countryId, rate);
		});

		// Map countries to their shipping rates
		const result = countries.map((country) => ({
			countryId: country.id,
			countryName: country.name,
			shippingRate: rateMap.get(country.id) || null,
		}));

		return result;
	} catch (error) {
		throw error;
	}
};

// Point: Function: upsertShippingRate
// Description: Upserts a shipping rate for a specific country, updating if it exists or creating a new one if not.
// Permission Level: Seller only
// Parameters:
//   - storeUrl: Url of the store you are trying to update.
//   - shippingRate: ShippingRate object containing the details of the shipping rate to be upserted.
// Returns: Updated or newly created shipping rate details.
export const upsertShippingRate = async (
	storeUrl: string,
	shippingRate: ShippingRate,
) => {
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

		// Make sure seller is updating their own store
		const check_ownership = await db.store.findUnique({
			where: {
				url: storeUrl,
				userId: user.id,
			},
		});

		if (!check_ownership)
			throw new Error(
				'Make sure you have the permissions to update this store',
			);

		// Ensure shipping rate data is provided
		if (!shippingRate) throw new Error('Please provide shipping rate data.');

		// Ensure countryId is provided
		if (!shippingRate.countryId)
			throw new Error('Please provide a valid country ID.');

		// Get store id
		const store = await db.store.findUnique({
			where: {
				url: storeUrl,
				userId: user.id,
			},
		});
		if (!store) throw new Error('Please provide a valid store URL.');

		// Upsert the shipping rate into the database
		const shippingRateDetails = await db.shippingRate.upsert({
			where: {
				id: shippingRate.id,
			},
			update: { ...shippingRate, storeId: store.id },
			create: { ...shippingRate, storeId: store.id },
		});

		return shippingRateDetails;
	} catch (error) {
		// Log and re-throw any errors
		throw error;
	}
};

/**
 * @name getStoreOrders
 * @description - Retrieves all orders for a specific store.
 *              - Returns order that include items, order details.
 * @access User
 * @param storeUrl - The url of the store whose order groups are being retrieved.
 * @returns {Array} - Array of order groups, including items.
 */
export const getStoreOrders = async (
	storeUrl: string,
	{
		page = 1,
		limit = 10,
		search = '',
		status = 'ALL',
	}: {
		page?: number;
		limit?: number;
		search?: string;
		status?: string;
	} = {},
) => {
	try {
		// Retrieve current user
		const user = await currentUser();

		// Check if user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Verify seller permission
		if (user.privateMetadata.role !== 'SELLER')
			throw new Error(
				'Unauthorized Access: Seller Privileges Required for Entry.',
			);

		// Get store id using url
		const store = await db.store.findUnique({
			where: {
				url: storeUrl,
			},
		});

		// Ensure store existence
		if (!store) throw new Error('Store not found.');

		// Verify ownership
		if (user.id !== store.userId) {
			throw new Error("You don't have permission to access this store.");
		}

		const skip = Math.max(0, (page - 1) * limit);
		const textSearch = search.trim();
		const referenceSearch = normalizeCommerceReference(textSearch);

		const where: Prisma.OrderGroupWhereInput = {
			storeId: store.id,
			...(status && status !== 'ALL' ? { status: status as OrderStatus } : {}),
			...(textSearch
				? {
						OR: [
							{
								id: {
									contains: referenceSearch,
									mode: 'insensitive' as const,
								},
							},
							{
								order: {
									id: {
										contains: referenceSearch,
										mode: 'insensitive' as const,
									},
								},
							},
							{
								order: {
									shippingAddress: {
										user: {
											OR: [
												{
													email: {
														contains: textSearch,
														mode: 'insensitive' as const,
													},
												},
												{
													name: {
														contains: textSearch,
														mode: 'insensitive' as const,
													},
												},
											],
										},
									},
								},
							},
							{
								order: {
									shippingAddress: {
										OR: [
											{
												firstName: {
													contains: textSearch,
													mode: 'insensitive' as const,
												},
											},
											{
												lastName: {
													contains: textSearch,
													mode: 'insensitive' as const,
												},
											},
										],
									},
								},
							},
							{
								items: {
									some: {
										OR: [
											{
												name: {
													contains: textSearch,
													mode: 'insensitive' as const,
												},
											},
											{
												sku: {
													contains: textSearch,
													mode: 'insensitive' as const,
												},
											},
										],
									},
								},
							},
						],
				  }
				: {}),
		};

		// Retrieve order groups for the specified store and user
		const [orders, totalCount] = await Promise.all([
			db.orderGroup.findMany({
				where,
				include: {
					items: true,
					coupon: true,
					order: {
						select: {
							id: true,
							orderStatus: true,
							paymentStatus: true,

							shippingAddress: {
								include: {
									country: true,
									user: {
										select: {
											email: true,
										},
									},
								},
							},
							paymentDetails: true,
						},
					},
				},
				orderBy: {
					updatedAt: 'desc',
				},
				skip,
				take: limit,
			}),
			db.orderGroup.count({ where }),
		]);

		return {
			orders,
			totalCount,
			totalPages: Math.ceil(totalCount / limit) || 1,
			page,
			limit,
		};
	} catch (error) {
		throw error;
	}
};

export const applySeller = async (store: StoreType) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Ensure store data is provided
		if (!store) throw new Error('Please provide store data.');

		// Check if store with same name, email,url, or phone number already exists
		const existingStore = await db.store.findFirst({
			where: {
				AND: [
					{
						OR: [
							{ name: store.name },
							{ email: store.email },
							{ phone: store.phone },
							{ url: store.url },
						],
					},
				],
			},
		});

		// If a store with same name, email, or phone number already exists, throw an error
		if (existingStore) {
			let errorMessage = '';
			if (existingStore.name === store.name) {
				errorMessage = 'A store with the same name already exists';
			} else if (existingStore.email === store.email) {
				errorMessage = 'A store with the same email already exists';
			} else if (existingStore.phone === store.phone) {
				errorMessage = 'A store with the same phone number already exists';
			} else if (existingStore.url === store.url) {
				errorMessage = 'A store with the same URL already exists';
			}
			throw new Error(errorMessage);
		}

		// Upsert store details into the database
		const storeDetails = await db.store.create({
			data: {
				...store,
				defaultShippingService:
					store.defaultShippingService || 'International Delivery',
				returnPolicy: store.returnPolicy || 'Return in 30 days.',
				userId: user.id,
			},
		});

		return storeDetails;
	} catch (error) {
		throw error;
	}
};

// Function: getAllStores
// Description: Retrieves all stores from the database.
// Permission Level: Admin only
// Parameters: None
// Returns: An array of store details.
export const getAllStores = async ({
	page = 1,
	limit = 10,
	search = '',
}: {
	page?: number;
	limit?: number;
	search?: string;
} = {}) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Verify admin permission
		if (user.privateMetadata.role !== 'ADMIN') {
			throw new Error(
				'Unauthorized Access: Admin Privileges Required to View Stores.',
			);
		}

		const skip = Math.max(0, (page - 1) * limit);

		const where = search.trim()
			? {
					OR: [
						{ name: { contains: search.trim(), mode: 'insensitive' as const } },
						{ url: { contains: search.trim(), mode: 'insensitive' as const } },
						{ email: { contains: search.trim(), mode: 'insensitive' as const } },
					],
			  }
			: {};

		// Fetch stores and count in parallel
		const [stores, totalCount] = await Promise.all([
			db.store.findMany({
				where,
				include: {
					user: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take: limit,
			}),
			db.store.count({ where }),
		]);

		return {
			stores,
			totalCount,
			totalPages: Math.ceil(totalCount / limit) || 1,
			page,
			limit,
		};
	} catch (error) {
		// Log and re-throw any errors
		throw error;
	}
};

export const updateStoreStatus = async (
	storeId: string,
	status: StoreStatus,
) => {
	// Retrieve current user
	const user = await currentUser();

	// Check if user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	// Verify admin permission
	if (user.privateMetadata.role !== 'ADMIN')
		throw new Error(
			'Unauthorized Access: Admin Privileges Required for Entry.',
		);

	const store = await db.store.findUnique({
		where: {
			id: storeId,
		},
	});

	// Verify seller ownership
	if (!store) {
		throw new Error('Store not found !');
	}

	// Retrieve the order to be updated
	const updatedStore = await db.store.update({
		where: {
			id: storeId,
		},
		data: {
			status,
		},
	});

	// Update the user role
	if (store.status === 'PENDING' && updatedStore.status === 'ACTIVE') {
		await db.user.update({
			where: {
				id: updatedStore.userId,
			},
			data: {
				role: 'SELLER',
			},
		});
	}

	return updatedStore.status;
};

// Function: deleteStore
// Description: Deletes a store from the database.
// Permission Level: Admin only
// Parameters:
//   - storeId: The ID of the store to be deleted.
// Returns: Response indicating success or failure of the deletion operation.
export const deleteStore = async (storeId: string) => {
	try {
		// Get current user
		const user = await currentUser();

		// Check if user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Verify admin permission
		if (user.privateMetadata.role !== 'ADMIN')
			throw new Error(
				'Unauthorized Access: Admin Privileges Required for Entry.',
			);

		// Ensure store ID is provided
		if (!storeId) throw new Error('Please provide store ID.');

		// Delete store from the database
		const response = await db.store.delete({
			where: {
				id: storeId,
			},
		});

		return response;
	} catch (error) {
		throw error;
	}
};

export const getStorePageDetails = async (storeUrl: string) => {
	const user = await currentUser();

	// Fetch the store details from the database
	const store = await db.store.findUnique({
		where: {
			url: storeUrl,
			status: 'ACTIVE',
		},
		select: {
			id: true,
			name: true,
			description: true,
			logo: true,
			cover: true,
			averageRating: true,
			numReviews: true,
			_count: {
				select: {
					followers: true,
				},
			},
		},
	});
	let isUserFollowingStore = false;
	if (user && store) {
		isUserFollowingStore = await checkIfUserFollowingStore(store.id, user.id);
	}
	// Handle case where the store is not found
	if (!store) {
		throw new Error(`Store with URL "${storeUrl}" not found.`);
	}
	return { ...store, isUserFollowingStore };
};

export const getStoreByUrl = async (storeUrl: string) => {
	try {
		if (!storeUrl) return null;

		let store = await db.store.findFirst({
			where: {
				url: {
					equals: storeUrl.trim(),
					mode: 'insensitive',
				},
			},
		});

		if (!store) {
			const user = await currentUser();
			if (user) {
				store = await db.store.findFirst({
					where: { userId: user.id },
				});
			}
		}

		return store;
	} catch (error) {
		console.error('getStoreByUrl error:', error);
		return null;
	}
};

