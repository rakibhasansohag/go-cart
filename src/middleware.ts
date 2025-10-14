import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { geolocation } from '@vercel/functions';
import { DEFAULT_COUNTRY } from './lib/utils';
import countries from '@/data/countries.json';

const protectedRoutes = createRouteMatcher([
	'/dashboard(.*)',
	'/checkout(.*)',
	'/profile(.*)',
]);
const authRoutes = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, req) => {
	const pathname = req.nextUrl.pathname;

	if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
		return NextResponse.next();
	}

	const { userId } = await auth();

	console.log('[middleware] path=', pathname, ' userId=', userId);

	// If a signed-in user tries to open /sign-in, send them away
	if (userId && authRoutes(req)) {
		return NextResponse.redirect(new URL('/', req.url));
	}

	// Protect routes: if not signed-in, do smarter redirect
	if (!userId && protectedRoutes(req)) {
		// look for session cookie — Clerk uses several cookie names depending on config.
		// check common candidates
		const cookieNames = [
			'__session',
			'__session_v1',
			'intermediate_session',
			'session',
		];

		const hasSessionCookie = cookieNames.some(
			(name) => !!req.cookies.get(name),
		);

		// Build sign-in url with return target
		const signInUrl = new URL('/sign-in', req.url);
		signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);

		if (hasSessionCookie) {
			// If a cookie was present but userId is null, go to an intermediate page
			// so client-side Clerk can try to recover session without redirect loops.
			const authCheckUrl = new URL('/auth-check', req.url);
			authCheckUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
			return NextResponse.redirect(authCheckUrl);
		} else {
			// No cookie — safe to redirect straight to sign-in
			return NextResponse.redirect(signInUrl);
		}
	}

	// Handle Country detection
	const response = NextResponse.next();
	const countryCookie = req.cookies.get('userCountry');

	if (!countryCookie) {
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
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/(api|trpc)(.*)',
	],
};
