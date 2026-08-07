import { NextRequest, NextResponse } from 'next/server';
import { getUserLoyaltyAccount } from '@/queries/loyalty';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const page = Number(searchParams.get('page')) || 1;
		const pageSize = Number(searchParams.get('pageSize')) || 10;

		const data = await getUserLoyaltyAccount(page, pageSize);
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
