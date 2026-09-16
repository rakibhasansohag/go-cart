'use server';

import { db } from '@/lib/db';

export async function updateVariantImage() {
	try {
		// Fetch all product variants that have images
		const variants = await db.productVariant.findMany({
			include: {
				images: true,
			},
		});

		// Update each variant with the first image URL
		const updates = variants
			.filter((variant) => variant.images.length > 0)
			.map((variant) =>
				db.productVariant.update({
					where: { id: variant.id },
					data: {
						variantImage: variant.images[0].url,
					},
				}),
			);
		await Promise.all(updates);
	} catch (error) {
		console.error('Error updating variant images:', error);
	}
}
