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

	// Let Clerk perform the correct document redirect / Server Action response.
	// Avoid guessing session state from internal cookie names, which can change
	// while Clerk refreshes a development session.
	if (!userId && protectedRoutes(req)) {
		return (await auth()).redirectToSignIn({ returnBackUrl: req.url });
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/(api|trpc)(.*)',
	],
};
