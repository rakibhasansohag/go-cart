// app/api/test-images/route.ts
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
	const variants = await db.productVariant.findMany({
		take: 5,
		include: {
			images: true,
			product: {
				select: {
					name: true,
				},
			},
		},
	});

	return NextResponse.json(variants, { status: 200 });
}
