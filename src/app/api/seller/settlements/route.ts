import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { listSellerSettlements } from '@/lib/settlement/service';

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
		const storeUrl = new URL(request.url).searchParams.get('storeUrl');
		const store = storeUrl ? await db.store.findFirst({ where: { url: storeUrl, userId }, select: { id: true } }) : null;
		if (storeUrl && !store) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
		const settlements = await listSellerSettlements(userId);
		return NextResponse.json({ settlements: store ? settlements.filter((item) => item.orderGroup.store.url === storeUrl) : settlements });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load earnings.' }, { status: 500 });
	}
}
