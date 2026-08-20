import { dispatchEmailOutboxBatch } from '@/lib/email/outbox';
import { enqueueAbandonedCheckoutReminders } from '@/lib/cart/abandoned-checkout';
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
		const reminders = await enqueueAbandonedCheckoutReminders();
		const delivery = await dispatchEmailOutboxBatch({
			limit: Math.max(1, reminders.sourceEventIds.length * 2),
			sourceEventIds: reminders.sourceEventIds,
		});
		return NextResponse.json({ ok: true, reminders, delivery });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Abandoned checkout job failed.';
		console.error('Abandoned checkout job failed:', message);
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}

export const GET = handle;
export const POST = handle;
