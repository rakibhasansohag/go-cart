import { NextResponse } from 'next/server';
import { cleanupNotificationDeliveryData } from '@/lib/notifications/retention';
import { isAuthorizedCronRequest } from '@/lib/security/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
	if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
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
