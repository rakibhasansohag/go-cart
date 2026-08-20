import { NextRequest, NextResponse } from 'next/server';
import { getUserReviews } from '@/queries/profile';
import { RequestGuardError, requireAuthenticatedUser } from '@/lib/security/request-guards';

import { ReviewDateFilter, ReviewFilter } from '@/lib/types';

export async function GET(req: NextRequest) {
	try {
		await requireAuthenticatedUser();
		const { searchParams } = new URL(req.url);
		const filter = (searchParams.get('filter') || '') as ReviewFilter;
		const period = (searchParams.get('period') || '') as ReviewDateFilter;
		const search = searchParams.get('search') || '';
		const page = Number(searchParams.get('page')) || 1;
		const pageSize = Number(searchParams.get('pageSize')) || 10;

		const data = await getUserReviews(filter, period, search, page, pageSize);
		return NextResponse.json(data);
	} catch (error) {
		if (error instanceof RequestGuardError)
			return NextResponse.json({ error: error.message }, { status: error.status });
		return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });
	}
}
