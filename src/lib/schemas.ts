import * as z from 'zod';

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
