import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// match all routes
const protectedRoutes = createRouteMatcher(['/dashboard', '/dashboard/(.*)']);

export default clerkMiddleware(async (auth, req, next) => {
	const { userId, redirectToSignIn } = await auth();

	if (!userId && protectedRoutes(req)) {
		return redirectToSignIn();
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
};

