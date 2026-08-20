import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/observability/logger";

const protectedRoutes = createRouteMatcher([
  "/dashboard(.*)",
  "/checkout(.*)",
  "/profile(.*)",
]);
const authRoutes = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const accountSuspendedRoute = createRouteMatcher(["/account-suspended"]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  const next = () => {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("x-request-id", requestId);
    return response;
  };
  const withRequestId = (response: NextResponse) => {
    response.headers.set("x-request-id", requestId);
    return response;
  };

  if (pathname.startsWith("/_next")) {
    return next();
  }

  const { userId } = await auth();

  logEvent("info", "request.received", { requestId, path: pathname, userId });

  if (userId) {
    try {
      const account = await db.user.findUnique({
        where: { id: userId },
        select: { accountStatus: true },
      });

      if (account?.accountStatus === "SUSPENDED" && !accountSuspendedRoute(req)) {
        logEvent("warn", "request.suspended_account", { requestId, path: pathname, userId });
        if (pathname.startsWith("/api")) {
          return withRequestId(
            NextResponse.json({ error: "This account is suspended." }, { status: 403 }),
          );
        }
        return withRequestId(
          NextResponse.redirect(new URL("/account-suspended", req.url)),
        );
      }
    } catch {
      logEvent("error", "request.account_status_unavailable", { requestId, path: pathname });
      if (pathname.startsWith("/api") || protectedRoutes(req)) {
        return withRequestId(
          NextResponse.json(
            { error: "Account access is temporarily unavailable." },
            { status: 503 },
          ),
        );
      }
    }
  }

  if (pathname.startsWith("/api")) {
    return next();
  }

  // If a signed-in user tries to open /sign-in, send them away
  if (userId && authRoutes(req)) {
    return withRequestId(NextResponse.redirect(new URL("/", req.url)));
  }

  // Let Clerk perform the correct document redirect / Server Action response.
  // Avoid guessing session state from internal cookie names, which can change
  // while Clerk refreshes a development session.
  if (!userId && protectedRoutes(req)) {
    return withRequestId(
      (await auth()).redirectToSignIn({ returnBackUrl: req.url }),
    );
  }

  return next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
