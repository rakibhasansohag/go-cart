'use server';

// Clerk
import { currentUser } from '@clerk/nextjs/server';

// DB
import { db } from '@/lib/db';
import { SubCategory } from '@prisma/client';

// Prisma model

// Point: Function: upsertSubCategory
// Description: Upserts a subCategory into the database, updating if it exists or creating a new one if not.
// Permission Level: Admin only
// Parameters:
//   - SubCategory: subCategory object containing details of the subCategory to be upserted.
// Returns: Updated or newly created subCategory details.
export const upsertSubCategory = async (
	subCategory: Omit<SubCategory, 'id'> & { id?: string },
) => {
	try {
		const user = await currentUser();

		if (!user) throw new Error('Unauthenticated.');

		if (user.privateMetadata.role !== 'ADMIN')
			throw new Error(
				'Unauthorized Access: Admin Privileges Required for Entry.',
			);

		if (!subCategory) throw new Error('Please provide subCategory data.');

		// If updating (has an id), validate it's a valid MongoDB ObjectId
		if (subCategory.id) {
			if (
				typeof subCategory.id !== 'string' ||
				!subCategory.id.match(/^[0-9a-f]{24}$/i)
			) {
				throw new Error('Invalid subCategory ID');
			}

			// Check for duplicates when updating
			const existingSubCategory = await db.subCategory.findFirst({
				where: {
					AND: [
						{
							OR: [{ name: subCategory.name }, { url: subCategory.url }],
						},
						{
							NOT: {
								id: subCategory.id,
							},
						},
					],
				},
			});

			if (existingSubCategory) {
				let errorMessage = '';
				if (existingSubCategory.name === subCategory.name) {
					errorMessage = 'A SubCategory with the same name already exists';
				} else if (existingSubCategory.url === subCategory.url) {
					errorMessage = 'A SubCategory with the same URL already exists';
				}
				throw new Error(errorMessage);
			}

			// Update existing
			return await db.subCategory.update({
				where: {
					id: subCategory.id,
				},
				data: {
					name: subCategory.name,
					url: subCategory.url,
					image: subCategory.image,
					featured: subCategory.featured,
					categoryId: subCategory.categoryId,
					updatedAt: new Date(),
				},
			});
		} else {
			// Check for duplicates when creating
			const existingSubCategory = await db.subCategory.findFirst({
				where: {
					OR: [{ name: subCategory.name }, { url: subCategory.url }],
				},
			});

			if (existingSubCategory) {
				let errorMessage = '';
				if (existingSubCategory.name === subCategory.name) {
					errorMessage = 'A SubCategory with the same name already exists';
				} else if (existingSubCategory.url === subCategory.url) {
					errorMessage = 'A SubCategory with the same URL already exists';
				}
				throw new Error(errorMessage);
			}

			// Create new (let MongoDB generate id)
			return await db.subCategory.create({
				data: {
					name: subCategory.name,
					url: subCategory.url,
					image: subCategory.image,
					featured: subCategory.featured,
					categoryId: subCategory.categoryId,
				},
			});
		}
	} catch (error) {
		throw error;
	}
};

// Point: Function: getAllSubCategories
// Description: Retrieves all subCategories from the database.
// Permission Level: Public
// Returns: Array of categories sorted by updatedAt date in descending order.
export const getAllSubCategories = async () => {
	// Retrieve all subCategories from the database
	const subCategories = await db.subCategory.findMany({
		include: {
			category: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	});
	return subCategories;
};

// Point: Function: getSubCategory
// Description: Retrieves a specific SubCategory from the database.
// Access Level: Public
// Parameters:
//   - SubCategoryId: The ID of the SubCategory to be retrieved.
// Returns: Details of the requested SubCategory.
export const getSubCategory = async (subCategoryId: string) => {
	// Ensure subCategory ID is provided
	if (!subCategoryId) throw new Error('Please provide suCategory ID.');

	// Retrieve subCategory
	const subCategory = await db.subCategory.findUnique({
		where: {
			id: subCategoryId,
		},
	});
	return subCategory;
};

// Point: Function: deleteSubCategory
// Description: Deletes a SubCategory from the database.
// Permission Level: Admin only
// Parameters:
//   - SubCategoryId: The ID of the SubCategory to be deleted.
// Returns: Response indicating success or failure of the deletion operation.
export const deleteSubCategory = async (subCategoryId: string) => {
	// Get current user
	const user = await currentUser();

	// Check if user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	// Verify admin permission
	if (user.privateMetadata.role !== 'ADMIN')
		throw new Error(
			'Unauthorized Access: Admin Privileges Required for Entry.',
		);

	// Ensure subCategory ID is provided
	if (!subCategoryId) throw new Error('Please provide category ID.');

	// Delete subCategory from the database
	const response = await db.subCategory.delete({
		where: {
			id: subCategoryId,
		},
	});
	return response;
};

// Point: Function: getSubcategories
// Description: Retrieves subcategories from the database, with options for limiting results and random selection.
// Parameters:
//   - limit: Number indicating the maximum number of subcategories to retrieve.
//   - random: Boolean indicating whether to return random subcategories.
// Returns: List of subcategories based on the provided options.
// export const getSubcategories = async (
// 	limit: number | null,
// 	random: boolean = false,
// ): Promise<SubCategory[]> => {
// 	// Define SortOrder enum
// 	enum SortOrder {
// 		asc = 'asc',
// 		desc = 'desc',
// 	}
// 	try {
// 		// Define the query options
// 		const queryOptions = {
// 			take: limit || undefined, // Use the provided limit or undefined for no limit
// 			orderBy: random ? { createdAt: SortOrder.desc } : undefined, // Use SortOrder for ordering
// 		};

// 		// If random selection is required, use a raw query to randomize
// 		if (random) {
// 			const subcategories = await db.$queryRaw<SubCategory[]>`
//     SELECT * FROM SubCategory
//     ORDER BY RAND()
//     LIMIT ${limit || 10}
//     `;
// 			return subcategories;
// 		} else {
// 			// Otherwise, fetch subcategories based on the defined query options
// 			const subcategories = await db.subCategory.findMany(queryOptions);
// 			return subcategories;
// 		}
// 	} catch (error) {
// 		// Log and re-throw any errors
// 		throw error;
// 	}
// };

// as  mongodb
export const getSubcategories = async (
	limit: number | null,
	random: boolean = false,
): Promise<SubCategory[]> => {
	try {
		if (random) {
			const allSubcategories = await db.subCategory.findMany();

			const shuffled = [...allSubcategories].sort(() => 0.5 - Math.random());

			// Return limited results
			return shuffled.slice(0, limit || 10);
		} else {
			// Otherwise, fetch subcategories with limit
			const subcategories = await db.subCategory.findMany({
				take: limit || undefined,
				orderBy: {
					createdAt: 'desc',
				},
			});
			return subcategories;
		}
	} catch (error) {
		// Log and re-throw any errors
		throw error;
	}
};
