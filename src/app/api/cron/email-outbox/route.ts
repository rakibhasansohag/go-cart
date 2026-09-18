import { dispatchEmailOutboxBatch } from '@/lib/email/outbox';
import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/security/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(request: Request) {
	if (!isAuthorizedCronRequest(request)) {
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

export async function GET(request: Request) {
	return handle(request);
}

export async function POST(request: Request) {
	return handle(request);
}

export async function HEAD(request: Request) {
	const res = await handle(request);
	return new Response(null, {
		status: res.status,
		headers: res.headers,
	});
}
