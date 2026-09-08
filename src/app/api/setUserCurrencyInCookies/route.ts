import { NextResponse } from 'next/server';
import { isSupportedCurrency } from '@/lib/currency/country-currency-map';
import {
	RequestGuardError,
	requireSameOriginMutation,
} from '@/lib/security/request-guards';

export async function POST(request: Request) {
	try {
		requireSameOriginMutation(request);
		const body = await request.json();
		const { currency } = body as { currency?: string };

		if (!currency || !isSupportedCurrency(currency)) {
			return NextResponse.json(
				{ error: 'Invalid or unsupported currency' },
				{ status: 400 },
			);
		}

		const response = NextResponse.json({ success: true, currency });
		response.cookies.set('userCurrency', currency, {
			httpOnly: false, // Accessible client-side so hydration/instant UI updates work
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 365, // 1 year
		});

		return response;
	} catch (error) {
		if (error instanceof RequestGuardError) {
			return new NextResponse(error.message, { status: error.status });
		}

		console.error('Failed to set user currency cookie:', error);
		return NextResponse.json(
			{ error: 'Failed to set currency' },
			{ status: 500 },
		);
	}
}
