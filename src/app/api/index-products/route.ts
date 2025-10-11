/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { db } from '@/lib/db';
import client from '@/lib/elasticsearch';
import { NextResponse } from 'next/server';

export async function POST() {
	try {
		const products = await db.product.findMany({
			include: {
				variants: {
					include: {
						images: {
							orderBy: {
								createdAt: 'asc',
							},
						},
					},
				},
			},
		});

		console.log('Total products fetched:', products.length);

		const body = products.flatMap((product) =>
			product.variants.flatMap((variant) => {
				const image = variant.images[0];

				console.log(
					`Variant: ${variant.variantName}, Images: ${
						variant.images.length
					}, Selected: ${image?.url || 'NONE'}`,
				);

				return [
					{
						index: { _index: 'products', _id: variant.id },
					},
					{
						name: `${product.name} · ${variant.variantName}`,
						link: `/product/${product.slug}?variant=${variant.slug}`,
						image: image?.url || '',
					},
				];
			}),
		);

		console.log(
			'Sample indexed data:',
			JSON.stringify(body.slice(0, 4), null, 2),
		);

		const bulkResponse = await client.bulk({ refresh: true, body });

		if (bulkResponse.errors) {
			const errorDetails = bulkResponse.items
				.filter((item: any) => item.index?.error)
				.map((item: any) => item.index.error);

			console.error('Elasticsearch errors:', errorDetails);

			return NextResponse.json(
				{
					message: 'Failed to index some products',
					errors: errorDetails,
				},
				{ status: 500 },
			);
		}

		const totalIndexed = products.reduce(
			(acc, p) => acc + p.variants.length,
			0,
		);

		return NextResponse.json(
			{
				message: 'Products indexed successfully',
				totalProducts: products.length,
				totalVariants: totalIndexed,
			},
			{ status: 200 },
		);
	} catch (error: any) {
		console.error('Error indexing products:', error);
		return NextResponse.json({ message: error.message }, { status: 500 });
	}
}
