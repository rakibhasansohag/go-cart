import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FulfillmentActorRole, FulfillmentSource, ShipmentStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { recordShipmentTrackingEvent } from '@/lib/shipments/operations';

const carrierWebhookSchema = z.object({
	shipmentId: z.string().optional(),
	trackingNumber: z.string().optional(),
	eventId: z.string().min(8),
	status: z.nativeEnum(ShipmentStatus),
	location: z.string().max(300).optional(),
	description: z.string().max(2_000).optional(),
	occurredAt: z.string().datetime().optional(),
	reasonCode: z.string().max(100).optional(),
	message: z.string().max(2_000).optional(),
	proofOfDeliveryUrl: z.string().url().optional(),
	proofOfDeliveryAt: z.string().datetime().optional(),
	});

function signatureMatches(rawBody: string, signature: string | null, secret: string) {
	if (!signature) return false;
	const supplied = signature.replace(/^sha256=/, '').trim();
	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
	const suppliedBuffer = Buffer.from(supplied, 'hex');
	const expectedBuffer = Buffer.from(expected, 'hex');
	return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
	const secret = process.env.CARRIER_WEBHOOK_SECRET?.trim();
	if (!secret) return NextResponse.json({ error: 'Carrier webhook is not configured.' }, { status: 503 });

	const rawBody = await request.text();
	if (!signatureMatches(rawBody, request.headers.get('x-carrier-signature'), secret)) {
		return NextResponse.json({ error: 'Invalid carrier signature.' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = JSON.parse(rawBody);
	} catch {
		return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
	}
	const parsed = carrierWebhookSchema.safeParse(body);
	if (!parsed.success || (!parsed.data.shipmentId && !parsed.data.trackingNumber)) {
		return NextResponse.json({ error: 'shipmentId or trackingNumber is required.', issues: parsed.success ? undefined : parsed.error.issues }, { status: 400 });
	}

	try {
		const result = await db.$transaction(async (tx) => {
			let shipmentId = parsed.data.shipmentId;
			if (!shipmentId && parsed.data.trackingNumber) {
				const shipment = await tx.shipment.findFirst({ where: { trackingNumber: parsed.data.trackingNumber }, select: { id: true } });
				shipmentId = shipment?.id;
			}
			if (!shipmentId) throw new Error('Shipment could not be resolved.');
			return { shipmentId };
		}).then(async ({ shipmentId }) => recordShipmentTrackingEvent({
			...parsed.data,
			shipmentId,
			providerEventId: parsed.data.eventId,
			idempotencyKey: `carrier:${parsed.data.eventId}`,
			actorRole: FulfillmentActorRole.CARRIER,
			source: FulfillmentSource.WEBHOOK,
		}));
		return NextResponse.json({ ok: true, duplicate: result.duplicate, trackingEventId: result.trackingEventId });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Carrier event rejected.';
		return NextResponse.json({ error: message }, { status: 422 });
	}
}
