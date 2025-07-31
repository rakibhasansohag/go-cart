'use server';

// Clerk
import { currentUser } from '@clerk/nextjs/server';

// DB
import { db } from '@/lib/db';

// Prisma model
import { Category } from '@prisma/client';

// Point:  Function: upsertCategory
// Description: This function is responsible for inserting or updating a category in the database.
// It checks if a category already exists using its name or URL. If it exists, the function updates it;
// otherwise, it creates a new category. Note: Only users with Admin privileges can perform this action.
// Parameters:
//   - category: An object containing the category details (name, URL, image, etc.) to be upserted.
// Returns: The details of the category that was updated or newly created.
export const upsertCategory = async (category: Category) => {
	try {
		// Get current user
		const user = await currentUser();

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Verify admin permission
		if (user.privateMetadata.role !== 'ADMIN')
			throw new Error(
				'Unauthorized Access: Admin Privileges Required for Entry.',
			);

		// Ensure category data is provided
		if (!category) throw new Error('Please provide category data.');

		// Throw error if category with same name or URL already exists
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

		// Throw error if category with same name or URL already exists
		if (existingCategory) {
			let errorMessage = '';
			if (existingCategory.name === category.name) {
				errorMessage = 'A category with the same name already exists';
			} else if (existingCategory.url === category.url) {
				errorMessage = 'A category with the same URL already exists';
			}
			throw new Error(errorMessage);
		}

		// Upsert category into the database
		const payload = {
			id: category.id,
			name: category.name,
			url: category.url,
			image: category.image,
			featured: category.featured,
			createdAt: category.createdAt,
			updatedAt: category.updatedAt,
		};

		const categoryDetails = await db.category.upsert({
			where: {
				id: category.id,
			},
			update: payload,
			create: payload,
		});
		return categoryDetails;
	} catch (error) {
		// Log and re-throw any errors
		// will remove the  console.log
		console.dir(error);
		throw error;
	}
};


// Point:  Function: getAllCategories
// Description: Retrieves all categories from the database.
// Permission Level: Public
// Returns: Array of categories sorted by updatedAt date in descending order.
export const getAllCategories = async (storeUrl?: string) => {
//  Retreive all categories from the database
const categories = await db.category.findMany({
	orderBy: {
		updatedAt: "desc"
	}
})
return categories
};

// Point:  Function: getCategory
// Description: Retrieves a specific category from the database.
// Access Level: Public
// Parameters:
//   - categoryId: The ID of the category to be retrieved.
// Returns: Details of the requested category.
export const getCategory = async (categoryId: string) => {
  // Ensure category ID is provided
  if (!categoryId) throw new Error("Please provide category ID.");

  // Retrieve category
  const category = await db.category.findUnique({
    where: {
      id: categoryId,
    },
  });
  return category;
};


// Point:  Function: deleteCategory
// Description: Deletes a category from the database.
// Permission Level: Admin only
// Parameters:
//   - categoryId: The ID of the category to be deleted.
// Returns: Response indicating success or failure of the deletion operation.
export const deleteCategory = async (categoryId: string) => {
  // Get current user
  const user = await currentUser();

  // Check if user is authenticated
  if (!user) throw new Error("Unauthenticated.");

  // Verify admin permission
  if (user.privateMetadata.role !== "ADMIN")
    throw new Error(
      "Unauthorized Access: Admin Privileges Required for Entry."
    );

  // Ensure category ID is provided
  if (!categoryId) throw new Error("Please provide category ID.");

  // Delete category from the database
  const response = await db.category.delete({
    where: {
      id: categoryId,
    },
  });
  return response;
};