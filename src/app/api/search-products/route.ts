import client from '@/lib/elasticsearch';
import { NextResponse } from 'next/server';

interface Product {
	name: string;
	image: string;
	link: string;
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const q = searchParams.get('search');

	if (!q || typeof q !== 'string') {
		return NextResponse.json(
			{ message: 'Invalid search query' },
			{ status: 400 },
		);
	}

	try {
		const response = await client.search<Product>({
			index: 'products',
			query: {
				match: {
					name: q,
				},
			},
			size: 20,
			_source: ['name', 'image', 'link'],
		});

		// Filter out undefined sources
		const results = response.hits.hits
			.map((hit) => hit._source)
			.filter((s): s is Product => typeof s !== 'undefined');

		return NextResponse.json(results);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		const errMsg = error?.message ?? String(error);
		const esType = error?.meta?.body?.error?.type || error?.body?.error?.type;

		if (
			esType === 'index_not_found_exception' ||
			errMsg?.includes('index_not_found_exception')
		) {
			return NextResponse.json(
				{ message: 'No products indexed yet. Index "products" not found.' },
				{ status: 404 },
			);
		}

		console.error('Elasticsearch search failed:', error);
		return NextResponse.json({ message: errMsg }, { status: 500 });
	}
}
