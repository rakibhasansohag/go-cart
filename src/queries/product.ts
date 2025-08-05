'use server';

import { currentUser } from '@clerk/nextjs/server';

// Slugify
import slugify from 'slugify';
import { generateUniqueSlug } from '@/lib/utils';
// Types
import { ProductWithVariantType } from '@/lib/types';
import { db } from '../lib/db';

// Function: upsertProduct
// Description: Upserts a product and its variant into the database, ensuring proper association with the store.
// Access Level: Seller Only
// Parameters:
//   - product: ProductWithVariant object containing details of the product and its variant.
//   - storeUrl: The URL of the store to which the product belongs.
// Returns: Newly created or updated product with variant details.
export const upsertProduct = async (
	product: ProductWithVariantType,
	storeUrl: string,
) => {
	try {
		// Retrieve current user
		const user = await currentUser();

		// Check if user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Ensure user has seller privileges
		if (user.privateMetadata.role !== 'SELLER')
			throw new Error(
				'Unauthorized Access: Seller Privileges Required for Entry.',
			);

		// Ensure product data is provided
		if (!product) throw new Error('Please provide product data.');

		// Find the store by URL
		const store = await db.store.findUnique({
			where: { url: storeUrl, userId: user.id },
		});
		if (!store) throw new Error('Store not found.');

		// Check if the product already exists
		const existingProduct = await db.product.findUnique({
			where: { id: product.productId },
		});

		// Check if the variant already exists
		const existingVariant = await db.productVariant.findUnique({
			where: { id: product.variantId },
		});

		if (existingProduct) {
			if (existingVariant) {
				// Update existing variant and product
			} else {
				// Create new variant
				await handleCreateVariant(product);
			}
		} else {
			// Create new product and variant
			await handleProductCreate(product, store.id);
		}
	} catch (error) {
		throw error;
	}
};

const handleProductCreate = async (
	product: ProductWithVariantType,
	storeId: string,
) => {
	// Generate unique slugs for product and variant
	const productSlug = await generateUniqueSlug(
		slugify(product.name, {
			replacement: '-',
			lower: true,
			trim: true,
		}),
		'product',
	);

	const variantSlug = await generateUniqueSlug(
		slugify(product.variantName, {
			replacement: '-',
			lower: true,
			trim: true,
		}),
		'productVariant',
	);

	const productData = {
		id: product.productId,
		name: product.name,
		description: product.description,
		slug: productSlug,
		store: { connect: { id: storeId } },
		category: { connect: { id: product.categoryId } },
		subCategory: { connect: { id: product.subCategoryId } },

		...(product.offerTagId && {
			offerTag: {
				connect: { id: product.offerTagId },
			},
		}),

		brand: product.brand,
		specs: {
			create: product.product_specs.map((spec) => ({
				name: spec.name,
				value: spec.value,
			})),
		},
		questions: {
			create: product.questions.map((q) => ({
				question: q.question,
				answer: q.answer,
			})),
		},
		variants: {
			create: [
				{
					id: product.variantId,
					variantName: product.variantName,
					variantDescription: product.variantDescription,
					slug: variantSlug,
					variantImage: product.variantImage,
					sku: product.sku,
					weight: product.weight,
					keywords: product.keywords.join(','),
					isSale: product.isSale,
					saleEndDate: product.saleEndDate,
					images: {
						create: product.images.map((img) => ({
							url: img.url,
						})),
					},
					colors: {
						create: product.colors.map((color) => ({
							name: color.color,
						})),
					},
					sizes: {
						create: product.sizes.map((size) => ({
							size: size.size,
							price: size.price,
							quantity: size.quantity,
							discount: size.discount,
						})),
					},
					specs: {
						create: product.variant_specs.map((spec) => ({
							name: spec.name,
							value: spec.value,
						})),
					},
					createdAt: product.createdAt,
					updatedAt: product.updatedAt,
				},
			],
		},
		shippingFeeMethod: product.shippingFeeMethod,
		freeShippingForAllCountries: product.freeShippingForAllCountries,
		freeShipping: product.freeShippingForAllCountries
			? undefined
			: product.freeShippingCountriesIds &&
			  product.freeShippingCountriesIds.length > 0
			? {
					create: {
						eligibaleCountries: {
							create: product.freeShippingCountriesIds.map((country) => ({
								country: { connect: { id: country.value } },
							})),
						},
					},
			  }
			: undefined,
		createdAt: product.createdAt,
		updatedAt: product.updatedAt,
	};

	const new_product = await db.product.create({ data: productData });
	return new_product;
};

const handleCreateVariant = async (product: ProductWithVariantType) => {
	const variantSlug = await generateUniqueSlug(
		slugify(product.variantName, {
			replacement: '-',
			lower: true,
			trim: true,
		}),
		'productVariant',
	);

	const variantData = {
		id: product.variantId,
		productId: product.productId,
		variantName: product.variantName,
		variantDescription: product.variantDescription,
		slug: variantSlug,
		isSale: product.isSale,
		saleEndDate: product.isSale ? product.saleEndDate : '',
		sku: product.sku,
		keywords: product.keywords.join(','),
		weight: product.weight,
		variantImage: product.variantImage,
		images: {
			create: product.images.map((img) => ({
				url: img.url,
			})),
		},
		colors: {
			create: product.colors.map((color) => ({
				name: color.color,
			})),
		},
		sizes: {
			create: product.sizes.map((size) => ({
				size: size.size,
				price: size.price,
				quantity: size.quantity,
				discount: size.discount,
			})),
		},
		specs: {
			create: product.variant_specs.map((spec) => ({
				name: spec.name,
				value: spec.value,
			})),
		},
		createdAt: product.createdAt,
		updatedAt: product.updatedAt,
	};

	const new_variant = await db.productVariant.create({ data: variantData });
	return new_variant;
};

// Point:  Function: getProductVariant
// Description: Retrieves details of a specific product variant from the database.
// Access Level: Public
// Parameters:
//   - productId: The id of the product to which the variant belongs.
//   - variantId: The id of the variant to be retrieved.
// Returns: Details of the requested product variant.
export const getProductVariant = async (
  productId: string,
  variantId: string
) => {
  // Retrieve product variant details from the database
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      category: true,
      subCategory: true,
      variants: {
        where: {
          id: variantId,
        },
        include: {
          images: true,
          colors: {
            select: {
              name: true,
            },
          },
          sizes: {
            select: {
              size: true,
              quantity: true,
              price: true,
              discount: true,
            },
          },
        },
      },
    },
  });
  if (!product) return;
  return {
    productId: product?.id,
    variantId: product?.variants[0].id,
    name: product.name,
    description: product?.description,
    variantName: product.variants[0].variantName,
    variantDescription: product.variants[0].variantDescription,
    images: product.variants[0].images,
    categoryId: product.categoryId,
    subCategoryId: product.subCategoryId,
    isSale: product.variants[0].isSale,
    brand: product.brand,
    sku: product.variants[0].sku,
    colors: product.variants[0].colors,
    sizes: product.variants[0].sizes,
    keywords: product.variants[0].keywords.split(","),
  };
};

// Point: Function: getProductMainInfo
// Description: Retrieves the main information of a specific product from the database.
// Access Level: Public
// Parameters:
//   - productId: The ID of the product to be retrieved.
// Returns: An object containing the main information of the product or null if the product is not found.
export const getProductMainInfo = async (productId: string) => {
  // Retrieve the product from the database
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      questions: true,
      specs: true,
    },
  });
  if (!product) return null;
 
  // Return the main information of the product
  return {
    productId: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    categoryId: product.categoryId,
    subCategoryId: product.subCategoryId,
    offerTagId: product.offerTagId || undefined,
    storeId: product.storeId,
    shippingFeeMethod: product.shippingFeeMethod,
    questions: product.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
    })),
    product_specs: product.specs.map((spec) => ({
      name: spec.name,
      value: spec.value,
    })),
  };
};

// Point:  Function: getAllStoreProducts
// Description: Retrieves all products from a specific store based on the store URL.
// Access Level: Public
// Parameters:
//   - storeUrl: The URL of the store whose products are to be retrieved.
// Returns: Array of products from the specified store, including category, subcategory, and variant details.
export const getAllStoreProducts = async (storeUrl: string) => {
  // Retrieve store details from the database using the store URL
  const store = await db.store.findUnique({ where: { url: storeUrl } });
  if (!store) throw new Error("Please provide a valid store URL.");

  // Retrieve all products associated with the store
  const products = await db.product.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      category: true,
      subCategory: true,
      offerTag: true,
      variants: {
        include: {
          images: { orderBy: { order: "asc" } },
          colors: true,
          sizes: true,
        },
      },
      store: {
        select: {
          id: true,
          url: true,
        },
      },
    },
  });

  return products;
};

// Point:  Function: deleteProduct
// Description: Deletes a product from the database.
// Permission Level: Seller only
// Parameters:
//   - productId: The ID of the product to be deleted.
// Returns: Response indicating success or failure of the deletion operation.
export const deleteProduct = async (productId: string) => {
  // Get current user
  const user = await currentUser();

  // Check if user is authenticated
  if (!user) throw new Error("Unauthenticated.");

  // Ensure user has seller privileges
  if (user.privateMetadata.role !== "SELLER")
    throw new Error(
      "Unauthorized Access: Seller Privileges Required for Entry."
    );

  // Ensure product data is provided
  if (!productId) throw new Error("Please provide product id.");

  // Delete product from the database
  const response = await db.product.delete({ where: { id: productId } });
  return response;
};

