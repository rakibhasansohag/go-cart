'use server';

// Clerk
import { currentUser } from '@clerk/nextjs/server';

// DB
import { db } from '@/lib/db';

// Prisma model
import { Category, SubCategory } from '@prisma/client';

// Function: upsertCategory
// Description: Upserts a category into the database, updating if it exists or creating a new one if not.
// Permission Level: Admin only
// Parameters:
//   - category: Category object containing details of the category to be upserted.
// Returns: Updated or newly created category details.
export const upsertCategory = async (
	category: Omit<Category, 'id'> & { id?: string },
) => {
	try {
		const user = await currentUser();

		if (!user) throw new Error('Unauthenticated.');

		if (user.privateMetadata.role !== 'ADMIN')
			throw new Error(
				'Unauthorized Access: Admin Privileges Required for Entry.',
			);

		if (!category) throw new Error('Please provide category data.');

		// If updating (has an id), validate it's a valid ObjectId
		if (category.id) {
			// Verify the ID is valid before querying
			if (
				typeof category.id !== 'string' ||
				!category.id.match(/^[0-9a-f]{24}$/i)
			) {
				throw new Error('Invalid category ID');
			}
		}

		// Only check for duplicates if updating an existing category
		if (category.id) {
			const existingCategory = await db.category.findFirst({
				where: {
					AND: [
						{
							OR: [{ name: category.name }, { url: category.url }],
						},
						{
							NOT: {
								id: category.id,
							},
						},
					],
				},
			});

			if (existingCategory) {
				let errorMessage = '';
				if (existingCategory.name === category.name) {
					errorMessage = 'A category with the same name already exists';
				} else if (existingCategory.url === category.url) {
					errorMessage = 'A category with the same URL already exists';
				}
				throw new Error(errorMessage);
			}

			// Update existing
			const categoryDetails = await db.category.update({
				where: {
					id: category.id,
				},
				data: category,
			});
			return categoryDetails;
		} else {
			// Create new (don't include id, let MongoDB generate it)
			const categoryDetails = await db.category.create({
				data: {
					name: category.name,
					url: category.url,
					image: category.image,
					featured: category.featured,
				},
			});
			return categoryDetails;
		}
	} catch (error) {
		throw error;
	}
};

// Function: getAllCategories
// Description: Retrieves all categories from the database.
// Permission Level: Public
// Returns: Array of categories sorted by updatedAt date in descending order.
export const getAllCategories = async (storeUrl?: string) => {
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

	// Retrieve all categories from the database
	const categories = await db.category.findMany({
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
			subCategories: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	});
	return categories;
};

export type CategoryWithSubs = Category & {
	subCategories: SubCategory[];
};

export const getAllCategoriesWithSubs = async (
	storeUrl?: string,
): Promise<CategoryWithSubs[]> => {
	let storeId: string | undefined;

	if (storeUrl) {
		const store = await db.store.findUnique({
			where: { url: storeUrl },
		});

		if (!store) {
			return [];
		}

		storeId = store.id;
	}

	const categories = await db.category.findMany({
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
			subCategories: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	});
	return categories;
};


// Function: getAllCategoriesForCategory
// Description: Retrieves all SubCategories fro a category from the database.
// Permission Level: Public
// Returns: Array of subCategories of category sorted by updatedAt date in descending order.
export const getAllCategoriesForCategory = async (categoryId: string) => {
	// Retrieve all subcategories of category from the database
	const subCategories = await db.subCategory.findMany({
		where: {
			categoryId,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	});
	return subCategories;
};

// Function: getCategory
// Description: Retrieves a specific category from the database.
// Access Level: Public
// Parameters:
//   - categoryId: The ID of the category to be retrieved.
// Returns: Details of the requested category.
export const getCategory = async (categoryId: string) => {
	// Ensure category ID is provided
	if (!categoryId) throw new Error('Please provide category ID.');

	// Retrieve category
	const category = await db.category.findUnique({
		where: {
			id: categoryId,
		},
	});
	return category;
};

// Function: deleteCategory
// Description: Deletes a category from the database.
// Permission Level: Admin only
// Parameters:
//   - categoryId: The ID of the category to be deleted.
// Returns: Response indicating success or failure of the deletion operation.
export const deleteCategory = async (categoryId: string) => {
	// Get current user
	const user = await currentUser();

	// Check if user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	// Verify admin permission
	if (user.privateMetadata.role !== 'ADMIN')
		throw new Error(
			'Unauthorized Access: Admin Privileges Required for Entry.',
		);

	// Ensure category ID is provided
	if (!categoryId) throw new Error('Please provide category ID.');

	// Delete category from the database
	const response = await db.category.delete({
		where: {
			id: categoryId,
		},
	});
	return response;
};
