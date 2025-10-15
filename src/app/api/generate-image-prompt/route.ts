/* eslint-disable @typescript-eslint/no-explicit-any */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
	try {
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
				{ error: 'Product name and description are required' },
				{ status: 400 },
			);
		}

		const model = genAI.getGenerativeModel({
			model: process.env.GEMINI_MODEL!,
		});

		const productDetails = `
Product Name: ${name}
Brand: ${brand || 'Not specified'}
Main Description: ${description}
Variant Name: ${variantName || 'Standard'}
Variant Description: ${variantDescription || 'No specific variant details'}
Primary Colors: ${
			(colors || []).map((c: any) => c.color).join(', ') || 'Not specified'
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

		// call model - SDK might return different shapes, so treat result as any
		const result: any = await model.generateContent(prompt);

		// Try several extraction strategies, with safe casts
		let imagePrompt = '';

		try {
			// 1) common pattern: result.response.text() -> string
			if (
				result?.response &&
				typeof (result.response as any).text === 'function'
			) {
				const raw = await (result.response as any).text();
				imagePrompt = String(raw ?? '').trim();
			}
			// 2) some SDK variations: result.output[0].content[0].text
			else if (Array.isArray(result?.output) && result.output[0]?.content) {
				// content might be array or object
				const c0 = result.output[0].content;
				if (Array.isArray(c0) && c0[0]?.text)
					imagePrompt = String(c0[0].text).trim();
				else if (c0?.text) imagePrompt = String(c0.text).trim();
			}
			// 3) some SDKs provide outputText
			else if (typeof result?.outputText === 'string') {
				imagePrompt = result.outputText.trim();
			}
			// 4) fallback if result is a raw string
			else if (typeof result === 'string') {
				imagePrompt = result.trim();
			} else {
				// fallback stringify for debugging
				imagePrompt = String(JSON.stringify(result)).slice(0, 1000);
			}
		} catch (err) {
			console.error('Error extracting text from Gemini result:', err);
			imagePrompt = '';
		}

		if (!imagePrompt) {
			console.error(
				'Full Gemini result (for debugging):',
				JSON.stringify(result).slice(0, 2000),
			);
			return NextResponse.json(
				{
					error: 'Empty image prompt from Gemini',
					details: 'No parsable text returned from model',
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, imagePrompt });
	} catch (error: any) {
		console.error('Error generating image prompt:', error);
		return NextResponse.json(
			{
				error: 'Failed to generate image prompt',
				details: error?.message || String(error),
			},
			{ status: 500 },
		);
	}
}
