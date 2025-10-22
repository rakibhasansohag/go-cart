import { DEFAULT_COUNTRY } from '../../../../lib/utils';
import countries from '../../../../data/countries.json';
import { NextRequest, NextResponse } from 'next/server';
import { geolocation } from '@vercel/functions';

export async function GET(req: NextRequest) {
	try {
		const geo = geolocation(req);
		const userCountry = {
			name:
				countries.find((c) => c.code === geo.country)?.name ||
				DEFAULT_COUNTRY.name,
			code: geo.country || DEFAULT_COUNTRY.code,
			city: geo.city || DEFAULT_COUNTRY.city,
			region: geo.region || DEFAULT_COUNTRY.region,
		};

		const response = NextResponse.json(userCountry);
		response.cookies.set('userCountry', JSON.stringify(userCountry), {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
		});

		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to detect country' },
			{ status: 500 },
		);
	}
}
