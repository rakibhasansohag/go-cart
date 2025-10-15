/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = process.env.GOOGLE_IMAGE_MODEL ?? 'gemini-2.5-flash-image';

let ai: any = null;
try {
	ai = new GoogleGenAI({
		apiKey: GEMINI_API_KEY,
	});
} catch (e) {
	ai = null;
}

async function generateWithGoogle(
	prompt: string,
	count: number,
	style?: string,
) {
	if (!ai) throw new Error('Google Gemini client not configured');

	const model = MODEL;
	const config = { responseModalities: ['IMAGE', 'TEXT'] };
	const contents = [{ role: 'user', parts: [{ text: prompt }] }];

	const images: string[] = [];
	// helper to extract inline images from a chunk of text
	const extractInlineImagesFromChunk = (chunk: any) => {
		const found: string[] = [];
		try {
			const candidates = chunk?.candidates ?? [];
			for (const cand of candidates) {
				const parts = cand?.content?.parts ?? [];
				for (const p of parts) {
					const inline = p?.inlineData;
					if (inline?.data && inline?.mimeType) {
						found.push(`data:${inline.mimeType};base64,${inline.data}`);
					} else if (
						typeof p?.content === 'string' &&
						p.content.startsWith('data:image/')
					) {
						found.push(p.content);
					}
				}
			}
		} catch (err) {
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
		.createHash('sha256')
		.update(prompt + Date.now() + Math.random())
		.digest('hex')
		.slice(0, 12);
	return Array.from({ length: count }).map(
		(_, i) => `https://picsum.photos/seed/${seed}-${i}/${1200}/${1200}`,
	);
};

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const prompt = String(body.prompt || '').trim();
		const count = Math.max(1, Math.min(6, Number(body.count || 4)));
		const style = body.style || 'varied';

		if (!prompt)
			return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

		// Try Google first
		if (ai) {
			try {
				const images = await generateWithGoogle(prompt, count, style);
				if (images && images.length > 0) {
					return NextResponse.json({
						images,
						provider: 'google',
						fallback: false,
					});
				} else {
					// no images returned (possible) — create fallback
					const fallbackImages = makeFallbackImages(prompt, count);
					return NextResponse.json({
						images: fallbackImages,
						provider: 'fallback',
						fallback: true,
						fallbackReason: 'Google returned no inline images',
					});
				}
			} catch (err: any) {
				// try to build a good fallbackReason with Google error details
				let fallbackReason = `Google error: ${String(err?.message ?? err)}`;

				// Attempt to extract retry info or status if available in nested error JSON
				try {
					// sometimes err.message contains JSON with error details. Try parse to pull retryDelay.
					const maybeJson = err?.message?.match(/\{[\s\S]*\}/);
					if (maybeJson) {
						const parsed = JSON.parse(maybeJson[0]);
						const gErr = parsed?.error;
						if (gErr?.details) {
							// try to extract retry info
							const retryInfo = (gErr.details || []).find((d: any) =>
								d['@type']?.includes('RetryInfo'),
							);
							if (retryInfo?.retryDelay) {
								fallbackReason += `; retryDelay=${retryInfo.retryDelay}`;
							}
						}
					}
				} catch (e) {
					// ignore parse errors, keep fallbackReason as-is
				}

				// produce randomized fallback images
				const fallbackImages = makeFallbackImages(prompt, count);
				return NextResponse.json({
					images: fallbackImages,
					provider: 'fallback',
					fallback: true,
					fallbackReason,
				});
			}
		}

		// If ai client not configured -> fallback
		const fallbackImages = makeFallbackImages(prompt, count);
		return NextResponse.json({
			images: fallbackImages,
			provider: 'fallback',
			fallback: true,
			fallbackReason:
				'Google client not configured (no GEMINI_API_KEY or client not installed)',
		});
	} catch (err: any) {
		console.error('generate-image internal error:', err);
		return NextResponse.json(
			{ error: err?.message || 'failed to generate images' },
			{ status: 500 },
		);
	}
}
