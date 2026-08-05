import { NextRequest, NextResponse } from 'next/server';
import { getUserReviews } from '@/queries/profile';

import { ReviewDateFilter, ReviewFilter } from '@/lib/types';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const filter = (searchParams.get('filter') || '') as ReviewFilter;
		const period = (searchParams.get('period') || '') as ReviewDateFilter;
		const search = searchParams.get('search') || '';
		const page = Number(searchParams.get('page')) || 1;
		const pageSize = Number(searchParams.get('pageSize')) || 10;

		const data = await getUserReviews(filter, period, search, page, pageSize);
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
}
