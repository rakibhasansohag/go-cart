import { NextResponse } from 'next/server';

import {
	ConnectRequestError,
	getStripePaymentAccountStatus,
} from '@/lib/payments/connect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
	const storeUrl = new URL(request.url).searchParams.get('storeUrl') ?? '';
	try {
		const account = await getStripePaymentAccountStatus(storeUrl);
		return NextResponse.json({ account });
	} catch (error) {
		const status = error instanceof ConnectRequestError ? error.status : 500;
		const message = error instanceof Error ? error.message : 'Unable to load Stripe payout status.';
		return NextResponse.json({ error: message }, { status });
	}
}
