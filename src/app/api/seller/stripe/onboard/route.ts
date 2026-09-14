import { NextResponse } from 'next/server';

import {
	ConnectRequestError,
	getOrCreateStripeOnboardingLink,
} from '@/lib/payments/connect';
import {
	requireSameOriginMutation,
	RequestGuardError,
} from '@/lib/security/request-guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const storeUrl = searchParams.get('storeUrl')?.trim() ?? '';
		if (!storeUrl) {
			return NextResponse.json(
				{ error: 'Store URL query parameter is required.' },
				{ status: 400 },
			);
		}

		const link = await getOrCreateStripeOnboardingLink(request, storeUrl);
		return NextResponse.redirect(link.url);
	} catch (error) {
		const status =
			error instanceof ConnectRequestError
				? error.status
				: 500;
		const message =
			error instanceof Error
				? error.message
				: 'Unable to start Stripe onboarding.';
		if (status === 500) {
			console.error('Seller Stripe onboard GET failed:', message);
		}
		return NextResponse.json({ error: message }, { status });
	}
}

export async function POST(request: Request) {
	try {
		requireSameOriginMutation(request);
		const body = (await request.json()) as { storeUrl?: unknown };
		const storeUrl = typeof body.storeUrl === 'string' ? body.storeUrl.trim() : '';
		if (!storeUrl) {
			return NextResponse.json(
				{ error: 'Store URL is required.' },
				{ status: 400 },
			);
		}

		const result = await getOrCreateStripeOnboardingLink(request, storeUrl);
		return NextResponse.json(result);
	} catch (error) {
		const status =
			error instanceof ConnectRequestError
				? error.status
				: error instanceof RequestGuardError
					? error.status
					: 500;
		const message =
			error instanceof Error
				? error.message
				: 'Unable to start Stripe onboarding.';
		if (status === 500) {
			console.error('Seller Stripe onboard POST failed:', message);
		}
		return NextResponse.json({ error: message }, { status });
	}
}
