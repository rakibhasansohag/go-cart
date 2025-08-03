'use server';

import { db } from '@/lib/db';

// Point: Function: getAllOfferTags
// Description: Retrieves all offer tags from the database.
// Permission Level: Public
// Returns: Array of offer tags sorted by updatedAt date in ascending order.
export const getAllOfferTags = async (storeUrl?: string) => {
	let storeId: string | undefined;

	if (storeUrl) {
		// Retrieve the storeId based on the storeUrl
		const store = await db.store.findUnique({
			where: { url: storeUrl },
		});

		// If no store is found, return an empty array or handle as needed
		if (!store) {
			return [];
		}

		storeId = store.id;
	}

	// Retrieve all offer tags from the database
	const offerTgas = await db.offerTag.findMany({
		where: storeId
			? {
					products: {
						some: {
							storeId: storeId,
						},
					},
			  }
			: {},
		include: {
			products: {
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			products: {
				_count: 'desc', // Order by the count of associated products in descending order
			},
		},
	});
	return offerTgas;
};
