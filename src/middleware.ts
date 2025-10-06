import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { geolocation } from '@vercel/functions';
import { DEFAULT_COUNTRY } from './lib/utils';
import countries from '@/data/countries.json';

// match all routes
const protectedRoutes = createRouteMatcher([
	'/dashboard',
	'/dashboard/(.*)',
	'/checkout',
]);

export default clerkMiddleware(async (auth, req, next) => {
	const { userId, redirectToSignIn } = await auth();

	if (!userId && protectedRoutes(req)) {
		return redirectToSignIn();
	}

	// Creating a basic response
	let response = NextResponse.next();

	/*---------Handle Country detection----------*/
	// Step 1: Check if country is already set in cookies
	const countryCookie = req.cookies.get('userCountry');

	if (countryCookie) {
		// If the user has already selected a country, use that for subsequent requests
		response = NextResponse.next();
	} else {
		// Step 2: Get the user country using the helper function
		const geo = geolocation(req);
		const userCountry = {
			name:
				countries.find((c) => c.code === geo.country)?.name ||
				DEFAULT_COUNTRY.name,
			code: geo.country || DEFAULT_COUNTRY.code,
			city: geo.city || DEFAULT_COUNTRY.city,
			region: geo.region || DEFAULT_COUNTRY.region,
		};
		response.cookies.set('userCountry', JSON.stringify(userCountry), {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
		});
	}

	return response;
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
};

