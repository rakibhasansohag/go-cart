import { NextResponse, after } from 'next/server';
import {
	handlePayPalEvent,
	verifyPayPalWebhook,
	type PayPalWebhookEvent,
} from '@/lib/payments/paypal-events';
import { queuesEnabled } from '@/lib/queue/config';
import { persistVerifiedPayment } from '@/lib/queue/payment-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	let verified = false;
	try {
		const event = (await request.json()) as PayPalWebhookEvent;
		await verifyPayPalWebhook(request.headers, event);
		verified = true;
		if (queuesEnabled()) {
			const job = await persistVerifiedPayment('Paypal', event);
			return NextResponse.json({ received: true, accepted: true, jobId: job.id });
		}
		const result = await handlePayPalEvent(event);

		const afterTask = async () => {
			console.log(`[paypal:webhook] Event ${event.id} (${event.event_type}) processed successfully.`);
		};

		try {
			after(afterTask);
		} catch {
			void afterTask();
		}

		return NextResponse.json({
			received: true,
			duplicate: 'duplicate' in result ? result.duplicate : false,
			ignored: 'ignored' in result ? result.ignored : false,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'PayPal webhook failed.';
		console.error('PayPal webhook processing failed:', error instanceof Error ? error.name : 'unknown');
		return NextResponse.json({ error: verified ? 'Webhook processing temporarily unavailable.' : message }, { status: verified ? 503 : 400 });
	}
}

