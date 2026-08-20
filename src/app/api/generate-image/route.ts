import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  RequestGuardError,
  requireAuthenticatedRole,
  requireSameOriginMutation,
} from "@/lib/security/request-guards";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.5-flash-image";

let ai: InstanceType<typeof GoogleGenAI> | null = null;
try {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });
} catch {
  ai = null;
}

async function generateWithGoogle(prompt: string, count: number) {
  if (!ai) throw new Error("Google Gemini client not configured");

  const model = MODEL;
  const config = { responseModalities: ["IMAGE", "TEXT"] };
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  const images: string[] = [];
  // helper to extract inline images from a chunk of text
  const extractInlineImagesFromChunk = (chunk: unknown) => {
    const found: string[] = [];
    try {
      const typedChunk = chunk as {
        candidates?: {
          content?: {
            parts?: {
              inlineData?: { data?: string; mimeType?: string };
              content?: string;
            }[];
          };
        }[];
      };
      const candidates = typedChunk?.candidates ?? [];
      for (const cand of candidates) {
        const parts = cand?.content?.parts ?? [];
        for (const p of parts) {
          const inline = p?.inlineData;
          if (inline?.data && inline?.mimeType) {
            found.push(`data:${inline.mimeType};base64,${inline.data}`);
          } else if (
            typeof p?.content === "string" &&
            p.content.startsWith("data:image/")
          ) {
            found.push(p.content);
          }
        }
      }
    } catch {
      // ignore malformed chunk
    }
    return found;
  };

  // stream and collect images
  const stream = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  for await (const chunk of stream) {
    const found = extractInlineImagesFromChunk(chunk);
    if (found.length) {
      images.push(...found);
      if (images.length >= count) break;
    }
  }

  // dedupe/limit
  return Array.from(new Set(images)).slice(0, count);
}

/**
 * Make free fallback images (picsum) but randomized so repeated calls don't return same images.
 */
const makeFallbackImages = (prompt: string, count: number) => {
  // cheaper, stronger randomness: combine prompt + timestamp + random bytes
  const seed = crypto
    .createHash("sha256")
    .update(prompt + Date.now() + Math.random())
    .digest("hex")
    .slice(0, 12);
  return Array.from({ length: count }).map(
    (_, i) => `https://picsum.photos/seed/${seed}-${i}/${1200}/${1200}`,
  );
};

function generateWithPollinations(prompt: string, count: number) {
  const images: string[] = [];
  const cleanPrompt = prompt
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 300);
  for (let i = 0; i < count; i++) {
    const seed = Math.floor(Math.random() * 999999);
    images.push(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(
        cleanPrompt,
      )}?width=800&height=800&seed=${seed}&nologo=true&model=flux`,
    );
  }
  return images;
}

export async function POST(req: NextRequest) {
  try {
    requireSameOriginMutation(req);
    const user = await requireAuthenticatedRole(["SELLER"]);
    const rateLimit = consumeRateLimit({
      key: `generate-image:${user.id}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Image generation limit reached. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim();
    const count = Math.max(1, Math.min(6, Number(body.count || 4)));
    if (!prompt)
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    if (prompt.length > 2_000) {
      return NextResponse.json(
        { error: "Prompt must be 2,000 characters or fewer." },
        { status: 400 },
      );
    }

    // 1. Try Google Gemini if configured
    if (ai) {
      try {
        const googleImages = await generateWithGoogle(prompt, count);
        if (googleImages && googleImages.length > 0) {
          return NextResponse.json({
            images: googleImages,
            provider: "google",
            fallback: false,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          "Google Gemini image generation failed, falling back to Pollinations AI...",
          msg,
        );
      }
    }

    // 2. Pollinations AI (Instant free AI image generation using Flux / Stable Diffusion)
    const pollinationsImages = generateWithPollinations(prompt, count);
    if (pollinationsImages && pollinationsImages.length > 0) {
      return NextResponse.json({
        images: pollinationsImages,
        provider: "pollinations",
        fallback: false,
      });
    }

    // 3. Last fallback (picsum)
    const fallbackImages = makeFallbackImages(prompt, count);
    return NextResponse.json({
      images: fallbackImages,
      provider: "fallback",
      fallback: true,
    });
  } catch (err) {
    if (err instanceof RequestGuardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("generate-image internal error:", err);
    return NextResponse.json(
      { error: "Failed to generate images." },
      { status: 500 },
    );
  }
}
