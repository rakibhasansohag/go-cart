import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cleanupNotificationDeliveryData } from '@/lib/notifications/retention';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
	const secret = process.env.CRON_SECRET;
	const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
	if (!secret || !supplied) return false;
	const expectedBuffer = Buffer.from(secret);
	const suppliedBuffer = Buffer.from(supplied);
	return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function handle(request: Request) {
	if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
	try {
		return NextResponse.json({ ok: true, ...(await cleanupNotificationDeliveryData()) });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Notification retention failed.';
		console.error('Notification retention failed:', message);
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}

export const GET = handle;
export const POST = handle;
