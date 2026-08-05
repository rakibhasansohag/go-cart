import { NextRequest, NextResponse } from 'next/server';
import { getUserOrders } from '@/queries/profile';

import { OrderTableDateFilter, OrderTableFilter } from '@/lib/types';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const filter = (searchParams.get('filter') || '') as OrderTableFilter;
		const period = (searchParams.get('period') || '') as OrderTableDateFilter;
		const search = searchParams.get('search') || '';
		const page = Number(searchParams.get('page')) || 1;
		const pageSize = Number(searchParams.get('pageSize')) || 10;

		const data = await getUserOrders(filter, period, search, page, pageSize);
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
}
