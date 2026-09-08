import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/currency/rates';

export const dynamic = 'force-dynamic';

export async function GET() {
	try {
		const result = await getExchangeRates();
		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to retrieve exchange rates:', error);
		return NextResponse.json(
			{ error: 'Failed to retrieve exchange rates' },
			{ status: 500 },
		);
	}
}
