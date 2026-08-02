import { dispatchEmailOutboxBatch } from '@/lib/email/outbox';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
	const secret = process.env.CRON_SECRET;
	const authorization = request.headers.get('authorization');
	if (!secret || !authorization?.startsWith('Bearer ')) return false;

	const supplied = authorization.slice('Bearer '.length);
	const expectedBuffer = Buffer.from(secret);
	const suppliedBuffer = Buffer.from(supplied);
	return (
		expectedBuffer.length === suppliedBuffer.length &&
		timingSafeEqual(expectedBuffer, suppliedBuffer)
	);
}

async function handle(request: Request) {
	if (!authorized(request)) {
		return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	try {
		const result = await dispatchEmailOutboxBatch();
		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Email recovery failed.';
		console.error('Email outbox recovery failed:', message);
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}

export const GET = handle;
export const POST = handle;
