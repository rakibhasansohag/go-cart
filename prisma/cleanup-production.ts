/**
 * cleanup-production.ts
 *
 * Safely removes all legacy test products, test categories, and associated data
 * from the production database to prepare for the centralized product hub.
 *
 * Usage:
 *   bun prisma/cleanup-production.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
	console.log('Starting production database product cleanup...');

	// 1. Get all products
	const products = await db.product.findMany({
		select: { id: true, name: true, slug: true },
	});

	console.log(`Found ${products.length} products to remove.`);

	for (const p of products) {
		const productVariants = await db.productVariant.findMany({
			where: { productId: p.id },
			select: { id: true },
		});
		const variantIds = productVariants.map((v) => v.id);

		// Delete reviews
		await db.review.deleteMany({ where: { productId: p.id } });

		// Delete wishlist entries
		await db.wishlist.deleteMany({
			where: {
				OR: [
					{ productId: p.id },
					{ variantId: { in: variantIds } },
				],
			},
		});

		// Delete questions & product questions
		await db.productQuestion.deleteMany({ where: { productId: p.id } });
		await db.question.deleteMany({ where: { productId: p.id } });

		// Delete free shipping
		const freeShipping = await db.freeShipping.findUnique({ where: { productId: p.id } });
		if (freeShipping) {
			await db.freeShippingCountry.deleteMany({ where: { freeShippingId: freeShipping.id } });
			await db.freeShipping.delete({ where: { id: freeShipping.id } });
		}

		// Delete specs
		await db.spec.deleteMany({
			where: {
				OR: [
					{ productId: p.id },
					{ variantId: { in: variantIds } },
				],
			},
		});

		// Delete variant images, sizes, colors
		if (variantIds.length > 0) {
			await db.productVariantImage.deleteMany({ where: { productVariantId: { in: variantIds } } });
			await db.size.deleteMany({ where: { productVariantId: { in: variantIds } } });
			await db.color.deleteMany({ where: { productVariantId: { in: variantIds } } });
		}

		// Delete variants
		await db.productVariant.deleteMany({ where: { productId: p.id } });

		// Delete product
		await db.product.delete({ where: { id: p.id } });

		console.log(`  [DELETED] ${p.name} (${p.slug})`);
	}

	// 2. Clean up legacy/test categories
	const obsoleteCategoryUrls = [
		'pant',
		'shirt',
		'man-shirt',
		'gocart-demo-category',
		'books-media',
		'baby-kids',
		'automotive',
	];

	for (const catUrl of obsoleteCategoryUrls) {
		const cat = await db.category.findUnique({
			where: { url: catUrl },
			select: { id: true, name: true },
		});
		if (cat) {
			await db.subCategory.deleteMany({ where: { categoryId: cat.id } });
			await db.category.delete({ where: { id: cat.id } });
			console.log(`  [DELETED CATEGORY] ${cat.name} (${catUrl})`);
		}
	}

	console.log('\nProduction cleanup complete!');
}

main()
	.catch((err) => {
		console.error('Cleanup failed:', err);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
