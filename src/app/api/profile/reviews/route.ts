import { NextRequest, NextResponse } from 'next/server';
import { getUserReviews } from '@/queries/profile';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const filter = searchParams.get('filter') || '';
		const period = searchParams.get('period') || '';
		const search = searchParams.get('search') || '';
		const page = Number(searchParams.get('page')) || 1;
		const pageSize = Number(searchParams.get('pageSize')) || 10;

		const data = await getUserReviews(filter as any, period as any, search, page, pageSize);
		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.toString() }, { status: 500 });
	}
}
