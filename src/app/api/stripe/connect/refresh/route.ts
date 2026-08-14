import { NextResponse } from 'next/server';

import {
	ConnectRequestError,
	getOrCreateStripeOnboardingLink,
} from '@/lib/payments/connect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
	const storeUrl = new URL(request.url).searchParams.get('storeUrl') ?? '';
	try {
		const link = await getOrCreateStripeOnboardingLink(request, storeUrl);
		return NextResponse.redirect(link.url);
	} catch (error) {
		const status = error instanceof ConnectRequestError ? error.status : 500;
		const message = error instanceof Error ? error.message : 'Unable to refresh Stripe onboarding.';
		return NextResponse.redirect(
			new URL(`/dashboard/seller/stores/${encodeURIComponent(storeUrl)}/settings?connect=error&message=${encodeURIComponent(message)}`, request.url),
			{ status: status >= 500 ? 303 : 303 },
		);
	}
}
