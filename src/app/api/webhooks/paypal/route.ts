import { NextResponse, after } from 'next/server';
import {
	handlePayPalEvent,
	verifyPayPalWebhook,
	type PayPalWebhookEvent,
} from '@/lib/payments/paypal-events';
import { publishToQueue, QUEUE_TOPICS } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	try {
		const event = (await request.json()) as PayPalWebhookEvent;
		await verifyPayPalWebhook(request.headers, event);
		const result = await handlePayPalEvent(event);

		const afterTask = async () => {
			void publishToQueue({
				topic: QUEUE_TOPICS.PAYMENT_EVENTS,
				eventKey: `paypal:${event.id}`,
				eventType: `paypal.${event.event_type}`,
				aggregateType: 'PAYMENT',
				aggregateId: event.id,
				payload: {
					eventId: event.id,
					eventType: event.event_type,
					resourceId: event.resource?.id,
				},
			}).catch((queueError: unknown) => {
				console.warn('[queue] PayPal event publishing skipped:', queueError);
			});
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
		console.error('PayPal webhook processing failed:', message);
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

