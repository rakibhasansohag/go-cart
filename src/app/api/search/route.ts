export const dynamic = "force-dynamic";
export const revalidate = 0;

import { SEARCH_MAX_QUERY_LENGTH, searchProducts } from "@/lib/search";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";

function searchClientKey(request: NextRequest) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") || searchParams.get("search") || "";

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    if (q.trim().length > SEARCH_MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { message: "Search query too long" },
        { status: 400 },
      );
    }

    const rateLimit = consumeRateLimit({
      key: `search:${searchClientKey(req)}`,
      limit: 90,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many search requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const results = await searchProducts(q);
    return NextResponse.json(results, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search is temporarily unavailable." },
      { status: 500 },
    );
  }
}
