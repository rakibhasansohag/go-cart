/**
 * seed-100-products.ts
 *
 * Expands the GoCart catalog by 100 products across 6 core categories.
 * Uploads 5 high-res images per product to Cloudinary (caching locally to avoid duplicate uploads).
 * Populates products, variants, images, sizes, specifications, and verified customer reviews.
 *
 * Usage:
 *   bun prisma/seed-100-products.ts
 */

import { PrismaClient, ShippingFeeMethod, StoreStatus } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CATALOG_PART_1, type SeedProductDef } from './catalog-data-part1';
import { CATALOG_PART_2 } from './catalog-data-part2';

const db = new PrismaClient();

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;
const CACHE_FILE = path.join(__dirname, '.cloudinary-image-cache.json');

// Local cache to avoid re-uploading identical images
let imageCache: Record<string, string> = {};
if (fs.existsSync(CACHE_FILE)) {
	try {
		imageCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as Record<string, string>;
	} catch {
		imageCache = {};
	}
}

function saveCache(): void {
	try {
		fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));
	} catch (err: unknown) {
		console.warn('Could not save image cache file:', err);
	}
}

async function uploadToCloudinary(sourceUrl: string, publicIdHint: string): Promise<string> {
	if (imageCache[publicIdHint]) {
		return imageCache[publicIdHint];
	}

	if (!CLOUD_NAME || !CLOUD_PRESET) {
		return sourceUrl;
	}

	try {
		const formData = new FormData();
		formData.append('file', sourceUrl);
		formData.append('upload_preset', CLOUD_PRESET);
		formData.append('folder', 'go-cart-ecommerce/products');
		formData.append('public_id', publicIdHint);

		const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			console.warn(`Cloudinary upload returned ${response.status} for ${publicIdHint}, using source URL.`);
			return sourceUrl;
		}

		const data = (await response.json()) as { secure_url?: string };
		if (data.secure_url) {
			imageCache[publicIdHint] = data.secure_url;
			return data.secure_url;
		}
	} catch (uploadErr: unknown) {
		console.warn(`Cloudinary upload error for ${publicIdHint}:`, uploadErr);
	}

	return sourceUrl;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seedCatalog(): Promise<void> {
	console.log('--- Starting Catalog Expansion Seeder (100 Products) ---');

	// 1. Locate primary store srank
	let store = await db.store.findUnique({ where: { url: 'srank' } });
	if (!store) {
		const anyStore = await db.store.findFirst({ where: { status: StoreStatus.ACTIVE } });
		if (!anyStore) {
			throw new Error('No active store found in database.');
		}
		store = anyStore;
	}
	console.log(`Using Store: "${store.name}" (${store.id})\n`);

	// 2. Fetch users for reviews
	const users = await db.user.findMany({ select: { id: true, name: true } });
	if (users.length === 0) {
		throw new Error('No users found in database to link reviews.');
	}
	console.log(`Found ${users.length} database users to distribute verified reviews across.`);

	// 3. Build Category and SubCategory maps
	const categories = await db.category.findMany({ include: { subCategories: true } });
	const categoryMap = new Map<string, string>();
	const subCategoryMap = new Map<string, string>();

	for (const cat of categories) {
		categoryMap.set(cat.url, cat.id);
		for (const sub of cat.subCategories) {
			subCategoryMap.set(sub.url, sub.id);
		}
	}

	const combinedCatalog: SeedProductDef[] = [...CATALOG_PART_1, ...CATALOG_PART_2];
	console.log(`Loaded ${combinedCatalog.length} products to seed.\n`);

	let seededCount = 0;
	let skippedCount = 0;
	let totalUploadedImages = 0;
	let totalReviewsAdded = 0;

	for (let i = 0; i < combinedCatalog.length; i++) {
		const def = combinedCatalog[i];
		const productIndex = i + 1;
		const productSlug = slugify(def.name);

		const categoryId = categoryMap.get(def.categoryUrl);
		const subCategoryId = subCategoryMap.get(def.subCategoryUrl);

		if (!categoryId || !subCategoryId) {
			console.warn(`[${productIndex}/${combinedCatalog.length}] Missing category or subcategory for: "${def.name}" (${def.categoryUrl} / ${def.subCategoryUrl})`);
			continue;
		}

		// Check if product already exists
		const existingProduct = await db.product.findUnique({ where: { slug: productSlug } });
		if (existingProduct) {
			skippedCount++;
			continue;
		}

		console.log(`[${productIndex}/${combinedCatalog.length}] Seeding: "${def.name}" (${def.brand})`);

		// Concurrently upload the 5 images for the variant
		const variantSlug = `${productSlug}-${slugify(def.variantName)}`;
		const variantSku = `${productSlug.slice(0, 8).toUpperCase()}-V1`;

		const imageUploadPromises = def.photoIds.map(async (photoId, imgIdx) => {
			const sourceUrl = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;
			const publicIdHint = `${productSlug}_${slugify(def.variantName)}_view_${imgIdx + 1}`;
			const cloudUrl = await uploadToCloudinary(sourceUrl, publicIdHint);
			return { url: cloudUrl, order: imgIdx };
		});

		const uploadedImages = await Promise.all(imageUploadPromises);
		totalUploadedImages += uploadedImages.length;
		saveCache();

		// Calculate average rating
		const avgRating = def.reviews.length > 0
			? parseFloat((def.reviews.reduce((acc, r) => acc + r.rating, 0) / def.reviews.length).toFixed(1))
			: 4.8;
		const randomSales = 18 + Math.floor(Math.random() * 45);

		// Create Product
		const product = await db.product.create({
			data: {
				name: def.name,
				slug: productSlug,
				brand: def.brand,
				description: def.description,
				storeId: store.id,
				categoryId,
				subCategoryId,
				shippingFeeMethod: ShippingFeeMethod.ITEM,
				rating: avgRating,
				sales: randomSales,
				numReviews: def.reviews.length,
			},
		});

		// Create Variant
		const mainImage = uploadedImages[0]?.url || `https://images.unsplash.com/photo-${def.photoIds[0]}?auto=format&fit=crop&w=1200&q=80`;
		const keywords = `${def.name}, ${def.brand}, ${def.categoryUrl}, ${def.subCategoryUrl}, ${def.variantName}`.toLowerCase();

		const variant = await db.productVariant.create({
			data: {
				variantName: def.variantName,
				variantDescription: def.description.slice(0, 160),
				variantImage: mainImage,
				slug: variantSlug,
				sku: variantSku,
				keywords,
				weight: def.weight,
				isSale: false,
				productId: product.id,
			},
		});

		// Create ProductVariantImages
		await db.productVariantImage.createMany({
			data: uploadedImages.map((img) => ({
				url: img.url,
				alt: `${def.name} - ${def.variantName} angle ${img.order + 1}`,
				order: img.order,
				productVariantId: variant.id,
			})),
		});

		// Create Sizes
		await db.size.createMany({
			data: def.sizes.map((s) => ({
				size: s.size,
				price: s.price,
				discount: s.discount,
				quantity: s.quantity,
				lowStockThreshold: 5,
				productVariantId: variant.id,
			})),
		});

		// Create Specs
		await db.spec.createMany({
			data: def.specs.map((sp) => ({
				name: sp.name,
				value: sp.value,
				variantId: variant.id,
			})),
		});

		// Create Authentic Reviews
		const firstSize = def.sizes[0]?.size || 'Standard';
		for (let rIdx = 0; rIdx < def.reviews.length; rIdx++) {
			const revDef = def.reviews[rIdx];
			const assignedUser = users[(productIndex + rIdx) % users.length];
			const reviewDate = daysAgo(10 + ((productIndex * 3 + rIdx * 7) % 80));

			await db.review.create({
				data: {
					variant: def.variantName,
					variantImage: mainImage,
					review: revDef.review,
					rating: revDef.rating,
					color: def.variantName,
					size: firstSize,
					quantity: '1',
					isVerifiedPurchase: true,
					helpfulCount: Math.floor(Math.random() * 12),
					userId: assignedUser.id,
					productId: product.id,
					createdAt: reviewDate,
				},
			});
			totalReviewsAdded++;
		}

		seededCount++;
	}

	saveCache();

	console.log('\n--- Seeding Complete ---');
	console.log(`Successfully Seeded: ${seededCount}`);
	console.log(`Skipped (Already Exists): ${skippedCount}`);
	console.log(`Images Stored / Cached: ${totalUploadedImages}`);
	console.log(`Customer Reviews Seeded: ${totalReviewsAdded}`);
}

seedCatalog()
	.catch((error: unknown) => {
		console.error('Seeder execution failed:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
