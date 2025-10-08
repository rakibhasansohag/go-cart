import * as z from 'zod';
import { ShippingFeeMethod } from '@prisma/client';

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

// Point : Products
export const ProductFormSchema = z.object({
	name: z
		.string()
		.nonempty('Product name is required.')
		.min(2, { message: 'Product name must be at least 2 characters long.' })
		.max(200, { message: 'Product name cannot exceed 200 characters.' })
		.regex(/^(?!.*(?:[-_ &' ]){2,})[a-zA-Z0-9_ '&-]+$/, {
			message:
				'Product name may only contain letters, numbers, spaces, hyphens, underscores, ampersands, and apostrophes, without consecutive special characters.',
		}),
	description: z
		.string()
		.nonempty('Product description is required.')
		.min(30, {
			message: 'Product description must be at least 30 characters long.',
		})
		.max(1000, {
			message: 'Product description cannot exceed 1000 characters.',
		}),
	variantName: z
		.string()
		.nonempty('Product variant name is required.')
		.min(2, {
			message: 'Product variant name must be at least 2 characters long.',
		})
		.max(100, {
			message: 'Product variant name cannot exceed 100 characters.',
		})
		.regex(/^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_ -]+$/, {
			message:
				'Product variant name may only contain letters, numbers, spaces, hyphens, and underscores, without consecutive special characters.',
		}),
	variantDescription: z
		.string()
		.nonempty('Product variant description is required.')
		.min(30, {
			message:
				'Product variant description must be at least 30 characters long.',
		})
		.max(1000, {
			message: 'Product variant description cannot exceed 1000 characters.',
		})
		.optional(),
	images: z
		.object({ url: z.string() })
		.array()
		.min(3, 'Please upload at least 3 images for the product.')
		.max(6, 'You can upload up to 6 images for the product.'),
	variantImage: z
		.object({ url: z.string() })
		.array()
		.length(1, 'Choose a product variant image.'),
	categoryId: z
		.string()
		.nonempty('Product category ID is required.')
		.uuid({ message: 'Product category ID must be a valid UUID.' }),
	subCategoryId: z
		.string()
		.nonempty('Product sub-category ID is required.')
		.uuid({ message: 'Product sub-category ID must be a valid UUID.' }),
	offerTagId: z
		.string()
		.uuid({ message: 'Offer tag ID must be a valid UUID.' })
		.optional()
		.or(z.literal('').transform(() => undefined)),
	brand: z
		.string()
		.nonempty('Product brand is required.')
		.min(2, {
			message: 'Product brand must be at least 2 characters long.',
		})
		.max(50, {
			message: 'Product brand cannot exceed 50 characters.',
		}),
	sku: z
		.string()
		.nonempty('Product SKU is required.')
		.min(6, {
			message: 'Product SKU must be at least 6 characters long.',
		})
		.max(50, {
			message: 'Product SKU cannot exceed 50 characters.',
		}),
	weight: z.number().min(0.01, {
		message: 'Please provide a valid product weight.',
	}),
	keywords: z
		.string()
		.array()
		.min(5, {
			message: 'Please provide at least 5 keywords.',
		})
		.max(10, {
			message: 'You can provide up to 10 keywords.',
		})
		.refine((keywords) => keywords.every((keyword) => keyword.length > 0), {
			message: 'All keywords must be filled.',
		}),
	colors: z
		.object({ color: z.string() })
		.array()
		.min(1, 'Please provide at least one color.')
		.refine((colors) => colors.every((c) => c.color.length > 0), {
			message: 'All color inputs must be filled.',
		}),
	sizes: z
		.object({
			size: z.string(),
			quantity: z
				.number()
				.min(1, { message: 'Quantity must be greater than 0.' }),
			price: z.number().min(0.01, { message: 'Price must be greater than 0.' }),
			discount: z.number().min(0).default(0),
		})
		.array()
		.min(1, 'Please provide at least one size.')
		.refine(
			(sizes) =>
				sizes.every((s) => s.size.length > 0 && s.price > 0 && s.quantity > 0),
			{
				message: 'All size inputs must be filled correctly.',
			},
		),
	product_specs: z
		.object({
			name: z.string(),
			value: z.string(),
		})
		.array()
		.min(1, 'Please provide at least one product spec.')
		.refine(
			(product_specs) =>
				product_specs.every((s) => s.name.length > 0 && s.value.length > 0),
			{
				message: 'All product specs inputs must be filled correctly.',
			},
		),
	variant_specs: z
		.object({
			name: z.string(),
			value: z.string(),
		})
		.array()
		.min(1, 'Please provide at least one product variant spec.')
		.refine(
			(variant_specs) =>
				variant_specs.every((s) => s.name.length > 0 && s.value.length > 0),
			{
				message: 'All product variant specs inputs must be filled correctly.',
			},
		),
	questions: z
		.object({
			question: z.string(),
			answer: z.string(),
		})
		.array()
		.min(1, 'Please provide at least one product question.')
		.refine(
			(questions) =>
				questions.every((q) => q.question.length > 0 && q.answer.length > 0),
			{
				message: 'All product question inputs must be filled correctly.',
			},
		),
	isSale: z.boolean().default(false),
	saleEndDate: z.string().default(() => new Date().toISOString()),
	freeShippingForAllCountries: z.boolean().default(false),
	freeShippingCountriesIds: z
		.object({
			id: z.string().optional(),
			label: z.string(),
			value: z.string(),
		})
		.array()
		.default([])
		.refine(
			(ids) => ids.every((item) => item.label && item.value),
			'Each country must have a valid name and ID.',
		),
	shippingFeeMethod: z.enum(['ITEM', 'WEIGHT', 'FIXED'], {
		message: 'Please select a valid shipping fee method.',
	}),
});

// Point: OfferTagFormSchema
export const OfferTagFormSchema = z.object({
	name: z
		.string()
		.nonempty('Offer tag name is required.')
		.min(2, { message: 'Category name must be at least 2 characters long.' })
		.max(50, { message: 'Category name cannot exceed 50 characters.' })
		.regex(/^[a-zA-Z0-9\s&$.%,']+$/, {
			message: 'Only letters, numbers, and common symbols are allowed.',
		}),

	url: z
		.string()
		.nonempty('Offer tag url is required.')
		.min(2, { message: 'Category url must be at least 2 characters long.' })
		.max(50, { message: 'Category url cannot exceed 50 characters.' })
		.regex(/^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_-]+$/, {
			message:
				'Only letters, numbers, hyphen, and underscore are allowed. No consecutive special characters.',
		}),
});


//  Point:  Store shipping defaults (store-level) 
export const StoreShippingFormSchema = z.object({
  defaultShippingService: z
    .string()
    .nonempty("Shipping service name is required.")
    .trim()
    .min(2, { message: "Shipping service name must be at least 2 characters long." })
    .max(50, { message: "Shipping service name cannot exceed 50 characters." }),

  defaultShippingFeePerItem: z
    .number({ error: "Default shipping fee per item must be a number." })
    .min(0, { message: "Default shipping fee per item cannot be negative." }),

  defaultShippingFeeForAdditionalItem: z
    .number({ error: "Default additional item fee must be a number." })
    .min(0, { message: "Default additional item fee cannot be negative." }),

  defaultShippingFeePerKg: z
    .number({ error: "Default shipping fee per kg must be a number." })
    .min(0, { message: "Default shipping fee per kg cannot be negative." }),

  defaultShippingFeeFixed: z
    .number({ error: "Default fixed shipping fee must be a number." })
    .min(0, { message: "Default fixed shipping fee cannot be negative." }),

  defaultDeliveryTimeMin: z
    .number({ error: "Minimum delivery time must be a number." })
    .int({ message: "Minimum delivery time must be an integer." })
    .min(0, { message: "Minimum delivery time cannot be negative." }),

  defaultDeliveryTimeMax: z
    .number({ error: "Maximum delivery time must be a number." })
    .int({ message: "Maximum delivery time must be an integer." })
    .min(0, { message: "Maximum delivery time cannot be negative." }),

  returnPolicy: z
    .string()
    .nonempty("Return policy is required.")
    .trim()
    .min(5, { message: "Return policy must be at least 5 characters long." })
    .max(2000, { message: "Return policy is too long." }),
});

// Point: Single shipping rate (per country / service) 
export const ShippingRateFormSchema = z.object({
  shippingService: z
    .string()
    .nonempty("Shipping service name is required.")
    .trim()
    .min(2, { message: "Shipping service name must be at least 2 characters long." })
    .max(50, { message: "Shipping service name cannot exceed 50 characters." }),

  countryId: z.string().uuid("countryId must be a valid UUID.").optional(),

  countryName: z.string().trim().max(100, { message: "Country name cannot exceed 100 characters." }).optional(),

  shippingFeePerItem: z
    .number({ error: "Shipping fee per item must be a number." })
    .min(0, { message: "Shipping fee per item cannot be negative." }),

  shippingFeeForAdditionalItem: z
    .number({ error: "Shipping fee for additional item must be a number." })
    .min(0, { message: "Shipping fee for additional item cannot be negative." }),

  shippingFeePerKg: z
    .number({ error: "Shipping fee per kg must be a number." })
    .min(0, { message: "Shipping fee per kg cannot be negative." }),

  shippingFeeFixed: z
    .number({ error: "Fixed shipping fee must be a number." })
    .min(0, { message: "Fixed shipping fee cannot be negative." }),

  deliveryTimeMin: z
    .number({ error: "Minimum delivery time must be a number." })
    .int({ message: "Minimum delivery time must be an integer." })
    .min(0, { message: "Minimum delivery time cannot be negative." }),

  deliveryTimeMax: z
    .number({ error: "Maximum delivery time must be a number." })
    .int({ message: "Maximum delivery time must be an integer." })
    .min(0, { message: "Maximum delivery time cannot be negative." }),

  returnPolicy: z
    .string()
    .nonempty("Return policy is required.")
    .trim()
    .min(1, { message: "Return policy is required." }),
});

// Point: Shipping address schema (checkout / user) 
export const ShippingAddressSchema = z.object({
  countryId: z.string().nonempty("Country is mandatory.").uuid("Country must be a valid UUID."),

  firstName: z
    .string()
    .nonempty("First name is mandatory.")
    .trim()
    .min(2, { message: "First name should be at least 2 characters long." })
    .max(50, { message: "First name cannot exceed 50 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "First name contains invalid characters." }),

  lastName: z
    .string()
    .nonempty("Last name is mandatory.")
    .trim()
    .min(2, { message: "Last name should be at least 2 characters long." })
    .max(50, { message: "Last name cannot exceed 50 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Last name contains invalid characters." }),

  phone: z
    .string()
    .nonempty("Phone number is mandatory.")
    .trim()
    .regex(/^\+?\d+$/, { message: "Invalid phone number format." }),

  address1: z
    .string()
    .nonempty("Address line 1 is mandatory.")
    .trim()
    .min(5, { message: "Address line 1 should be at least 5 characters long." })
    .max(200, { message: "Address line 1 cannot exceed 200 characters." }),

  address2: z.string().trim().max(200, { message: "Address line 2 cannot exceed 200 characters." }).optional(),

  state: z
    .string()
    .nonempty("State is mandatory.")
    .trim()
    .min(2, { message: "State should be at least 2 characters long." })
    .max(100, { message: "State cannot exceed 100 characters." }),

  city: z
    .string()
    .nonempty("City is mandatory.")
    .trim()
    .min(2, { message: "City should be at least 2 characters long." })
    .max(100, { message: "City cannot exceed 100 characters." }),

  zip_code: z
    .string()
    .nonempty("Zip code is mandatory.")
    .trim()
    .min(2, { message: "Zip code should be at least 2 characters long." })
    .max(20, { message: "Zip code cannot exceed 20 characters." })
    .regex(/^[A-Za-z0-9 -]+$/, { message: "Zip code contains invalid characters." }),

  default: z.boolean().default(false).optional(),
});


// Add review schema
export const AddReviewSchema = z.object({
  variantName: z.string().min(1, "Variant is required."),
  variantImage: z.string().min(1, "Variant image is required."),
  rating: z.number().min(1, "Please rate this product."),
  size: z.string().min(1, "Please select a size."),
  review: z.string().min(10, "Your feedback matters! Please write a review of minimum 10 characters."),
  
  quantity: z.string().optional().default("1"),
  images: z.object({ url: z.string() }).array().max(3, "You can upload up to 3 images for the review."),
  color: z.string().min(1, "Please select a color."),
});

export type AddReviewForm = z.infer<typeof AddReviewSchema>;


export const ApplyCouponFormSchema = z.object({
	coupon: z
		.string()
		.nonempty('Coupon code is required.')
		.trim()
		.min(1, { message: 'Coupon code is required.' }),
});

export const CouponFormSchema = z
	.object({
		code: z
			.string()
			.min(2, 'Coupon code must be at least 2 characters long.')
			.max(50, 'Coupon code cannot exceed 50 characters.')
			.regex(
				/^[a-zA-Z0-9_-]+$/,
				'Only letters, numbers, underscores, and hyphens are allowed.',
			),

		startDate: z
			.string()
			.refine(
				(val) => !isNaN(Date.parse(val)),
				'Start date must be a valid date.',
			),

		endDate: z
			.string()
			.refine(
				(val) => !isNaN(Date.parse(val)),
				'End date must be a valid date.',
			),

		discount: z
			.number()
			.min(1, 'Discount must be at least 1%.')
			.max(99, 'Discount cannot exceed 99%.'),

		storeId: z.string().optional(),
	})
	.refine((data) => new Date(data.endDate) > new Date(data.startDate), {
		message: 'End date must be after the start date.',
		path: ['endDate'],
	});

