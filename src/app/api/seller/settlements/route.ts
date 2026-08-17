import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { listSellerSettlements } from '@/lib/settlement/service';

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
		const searchParams = new URL(request.url).searchParams;
		const storeUrl = searchParams.get('storeUrl');
		const page = Number(searchParams.get('page'));
		const store = storeUrl ? await db.store.findFirst({ where: { url: storeUrl, userId }, select: { id: true } }) : null;
		if (storeUrl && !store) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
		const result = await listSellerSettlements({ sellerId: userId, storeUrl: storeUrl ?? undefined, page });
		return NextResponse.json({ settlements: result.items, pagination: result.pagination, summary: result.summary });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load earnings.' }, { status: 500 });
	}
}
