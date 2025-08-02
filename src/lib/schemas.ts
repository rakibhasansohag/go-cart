import * as z from 'zod';
// Point: Category
export const CategoryFormSchema = z.object({
	name: z
		.string()
		.nonempty('Category name is required.')
		.min(2, { message: 'Category name must be at least 2 characters long.' })
		.max(50, { message: 'Category name cannot exceed 50 characters.' })
		.regex(/^[a-zA-Z0-9\s'&-]+$/, {
			message:
				'Only letters, numbers, and spaces are allowed in the category name.',
		}),
	image: z
		.object({
			url: z.string(),
		})
		.array()
		.length(1, 'Choose a category image.'),
	url: z
		.string()
		.nonempty('Category url is required')
		.min(2, { message: 'Category url must be at least 2 characters long.' })
		.max(50, { message: 'Category url cannot exceed 50 characters.' })
		.regex(/^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_-]+$/, {
			message:
				'Only letters, numbers, hyphen, and underscore are allowed in the category url, and consecutive occurrences of hyphens, underscores, or spaces are not permitted.',
		}),
	featured: z.boolean().default(false).optional(),
});

// Point: SubCategory
export const SubCategoryFormSchema = z.object({
	name: z
		.string()
		.nonempty('SubCategory name is required.')
		.min(2, { message: 'SubCategory name must be at least 2 characters long.' })
		.max(50, { message: 'SubCategory name cannot exceed 50 characters.' })
		.regex(/^[a-zA-Z0-9\s'&-]+$/, {
			message:
				'Only letters, numbers, spaces, apostrophes, ampersands, and hyphens are allowed in the subCategory name.',
		}),
	image: z
		.object({
			url: z.string(),
		})
		.array()
		.length(1, 'Choose only one subCategory image.'),
	url: z
		.string()
		.nonempty('SubCategory url is required.')
		.min(2, { message: 'SubCategory url must be at least 2 characters long.' })
		.max(50, { message: 'SubCategory url cannot exceed 50 characters.' })
		.regex(/^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_-]+$/, {
			message:
				'Only letters, numbers, hyphen, and underscore are allowed in the subCategory url, and consecutive occurrences of hyphens, underscores, or spaces are not permitted.',
		}),
	categoryId: z.string().uuid(),
	featured: z.boolean().default(false).optional(),
});

// Point: Store
export const StoreFormSchema = z.object({
	name: z
		.string()
		.nonempty('Store name is required.')
		.min(2, { message: 'Store name must be at least 2 characters long.' })
		.max(50, { message: 'Store name cannot exceed 50 characters.' })
		.regex(/^(?!.*(?:[-_& ]){2,})[a-zA-Z0-9_ &-]+$/, {
			message:
				'Only letters, numbers, space, hyphen, and underscore are allowed in the store name, and no consecutive special characters.',
		}),
	description: z
		.string()
		.nonempty('Store description is required.')
		.min(30, {
			message: 'Store description must be at least 30 characters long.',
		})
		.max(500, { message: 'Store description cannot exceed 500 characters.' }),
	email: z
		.string()
		.nonempty('Store email is required.')
		.email({ message: 'Invalid email format.' }),
	phone: z
		.string()
		.nonempty('Store phone number is required.')
		.regex(/^\+?\d+$/, { message: 'Invalid phone number format.' }),
	logo: z.object({ url: z.string() }).array().length(1, 'Choose a logo image.'),
	cover: z
		.object({ url: z.string() })
		.array()
		.length(1, 'Choose a cover image.'),
	url: z
		.string()
		.nonempty('Store url is required.')
		.min(2, { message: 'Store url must be at least 2 characters long.' })
		.max(50, { message: 'Store url cannot exceed 50 characters.' })
		.regex(/^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_-]+$/, {
			message:
				'Only letters, numbers, hyphen, and underscore are allowed in the store url, and consecutive occurrences are not permitted.',
		}),
	featured: z.boolean().default(false).optional(),
	status: z.string().default('PENDING').optional(),
});