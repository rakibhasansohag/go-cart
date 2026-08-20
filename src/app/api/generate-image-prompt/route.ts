import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  RequestGuardError,
  requireAuthenticatedRole,
  requireSameOriginMutation,
} from "@/lib/security/request-guards";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    requireSameOriginMutation(req);
    const user = await requireAuthenticatedRole(["SELLER"]);
    const rateLimit = consumeRateLimit({
      key: `generate-image-prompt:${user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Image prompt generation limit reached. Please try again shortly.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      variantName,
      variantDescription,
      brand,
      colors,
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Product name and description are required" },
        { status: 400 },
      );
    }
    if (
      String(name).length > 300 ||
      String(description).length > 5_000 ||
      String(variantName ?? "").length > 300 ||
      String(variantDescription ?? "").length > 3_000 ||
      String(brand ?? "").length > 300
    ) {
      return NextResponse.json(
        { error: "Product fields exceed the allowed generation size." },
        { status: 400 },
      );
    }

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL!,
    });

    const productDetails = `
Product Name: ${name}
Brand: ${brand || "Not specified"}
Main Description: ${description}
Variant Name: ${variantName || "Standard"}
Variant Description: ${variantDescription || "No specific variant details"}
Product Primary Colors: ${
      (colors || []).map((c: { color: string }) => c.color).join(", ") ||
      "Not specified"
    }
`;

    const prompt = `
You are an expert AI image prompt engineer for e-commerce.
Analyze the following product details and generate a single, highly detailed,
photorealistic image prompt suitable for Midjourney / DALL-E / Stable Diffusion / Nano Banana.

Product Details:
---
${productDetails}
---

CRITICAL: Return a single continuous descriptive text prompt (no markdown). Max 180 words.
Include photographic style hints: photorealistic, 8k, soft studio lighting, shallow depth of field, high detail, commercial shot.
Specify background (e.g., clean white studio, rustic wooden table), material, texture, and mood.
Generate the prompt now:
`;

    const result = await model.generateContent(prompt);

    let imagePrompt = "";

    try {
      if (
        result?.response &&
        "text" in result.response &&
        typeof result.response.text === "function"
      ) {
        const raw = await result.response.text();
        imagePrompt = String(raw ?? "").trim();
      }
    } catch (err) {
      console.error("Error extracting text from Gemini result:", err);
      imagePrompt = "";
    }

    if (!imagePrompt) {
      return NextResponse.json(
        {
          error: "Empty image prompt from Gemini",
          details: "No parsable text returned from model",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, imagePrompt });
  } catch (error) {
    if (error instanceof RequestGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Error generating image prompt:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image prompt",
      },
      { status: 500 },
    );
  }
}
