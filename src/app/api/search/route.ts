export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { searchProducts } from '@/lib/search';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const q = searchParams.get('q') || searchParams.get('search') || '';

		if (!q || typeof q !== 'string' || q.trim().length === 0) {
			return NextResponse.json([], {
				headers: {
					'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
				},
			});
		}

		if (q.length > 100) {
			return NextResponse.json(
				{ message: 'Search query too long' },
				{ status: 400 },
			);
		}

		const results = await searchProducts(q);
		return NextResponse.json(results, {
			headers: {
				'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
			},
		});
	} catch (error) {
		console.error('Search API error:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
