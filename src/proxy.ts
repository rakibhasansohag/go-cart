import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

	console.log('[proxy] path=', pathname, ' userId=', userId);

	// If a signed-in user tries to open /sign-in, send them away
	if (userId && authRoutes(req)) {
		return NextResponse.redirect(new URL('/', req.url));
	}

	// Protect routes: if not signed-in, do smarter redirect
	if (!userId && protectedRoutes(req)) {
		const cookieNames = [
			'__session',
			'__session_v1',
			'intermediate_session',
			'session',
		];

		const hasSessionCookie = cookieNames.some(
			(name) => !!req.cookies.get(name),
		);

		const signInUrl = new URL('/sign-in', req.url);
		signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);

		if (hasSessionCookie) {
			const authCheckUrl = new URL('/auth-check', req.url);
			authCheckUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
			return NextResponse.redirect(authCheckUrl);
		} else {
			return NextResponse.redirect(signInUrl);
		}
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/(api|trpc)(.*)',
	],
};
