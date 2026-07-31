import { NextResponse } from 'next/server';
import {
	handlePayPalEvent,
	verifyPayPalWebhook,
	type PayPalWebhookEvent,
} from '@/lib/payments/paypal-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	try {
		const event = (await request.json()) as PayPalWebhookEvent;
		await verifyPayPalWebhook(request.headers, event);
		const result = await handlePayPalEvent(event);

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

