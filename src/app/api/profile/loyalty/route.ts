import { NextRequest, NextResponse } from 'next/server';
import { getUserLoyaltyAccount } from '@/queries/loyalty';
import { RequestGuardError, requireAuthenticatedUser } from '@/lib/security/request-guards';

export async function GET(req: NextRequest) {
	try {
		await requireAuthenticatedUser();
		const { searchParams } = new URL(req.url);
		const page = Number(searchParams.get('page')) || 1;
		const pageSize = Number(searchParams.get('pageSize')) || 10;

		const data = await getUserLoyaltyAccount(page, pageSize);
		return NextResponse.json(data);
	} catch (error) {
		if (error instanceof RequestGuardError)
			return NextResponse.json({ error: error.message }, { status: error.status });
		return NextResponse.json(
			{ error: 'Unable to load loyalty activity.' },
			{ status: 500 },
		);
	}
}
