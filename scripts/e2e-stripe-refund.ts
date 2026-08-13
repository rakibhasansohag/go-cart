import { createHash, randomUUID } from 'node:crypto';
import { PaymentMethod, PaymentStatus, ReturnReason, ReturnRequestStatus, ReturnResolution } from '@prisma/client';
import type Stripe from 'stripe';
import { db } from '../src/lib/db';
import { getStripeClient } from '../src/lib/payments/stripe-client';
import { issueReturnRefundForAdmin } from '../src/lib/payments/refund';
import { reconcileReturnInventoryForAdmin } from '../src/lib/returns/inventory';
import { handleStripeEvent } from '../src/lib/payments/stripe-events';

function demoFixtureId(kind: string, index: number) {
	const hex = createHash('sha256').update(`gocart-demo:${kind}:${index}`).digest('hex').slice(0, 32);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function main() {
	if (process.env.E2E_STRIPE_REFUND !== 'true') throw new Error('Set E2E_STRIPE_REFUND=true to run the external Stripe refund test.');
	if (process.env.E2E_PROVIDER_MODE !== 'sandbox') throw new Error('The Stripe refund test requires E2E_PROVIDER_MODE=sandbox.');

	const customerEmail = process.env.E2E_CUSTOMER_EMAIL;
	const adminEmail = process.env.E2E_ADMIN_EMAIL;
	assert(customerEmail && adminEmail, 'E2E customer and admin emails are required.');

	const admin = await db.user.findUnique({ where: { email: adminEmail }, select: { id: true, role: true } });
	assert(admin?.role === 'ADMIN', 'A seeded E2E admin is required.');
	const customer = await db.user.findUnique({ where: { email: customerEmail }, select: { id: true } });
	assert(customer, 'The configured E2E customer is missing.');

	const item = await db.orderItem.findUnique({
		where: { id: demoFixtureId('item', 5) },
		include: { orderGroup: { include: { order: { include: { paymentDetails: true } }, store: { select: { id: true } } } } },
	});
	assert(item, 'The deterministic delivered order fixture is missing.');
	assert(item.orderGroup.order.userId === customer.id, 'The deterministic delivered order does not belong to the E2E customer.');
	const paymentDetails = item.orderGroup.order.paymentDetails;
	assert(paymentDetails, 'The deterministic order payment fixture is missing.');

	const order = item.orderGroup.order;
	const originalPayment = { ...paymentDetails };
	const originalOrder = { paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod, orderStatus: order.orderStatus };
	const originalItem = { status: item.status, deliveredAt: item.deliveredAt };
	const originalGroupStatus = item.orderGroup.status;
	const originalSize = await db.size.findUniqueOrThrow({ where: { id: item.sizeId }, select: { quantity: true } });
	const stripe = getStripeClient();
	const paymentIntent = await stripe.paymentIntents.create(
		{
			amount: Math.round(order.total * 100),
			currency: paymentDetails.currency.toLowerCase(),
			automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
			payment_method: 'pm_card_visa',
			confirm: true,
			metadata: { orderId: order.id, e2ePurpose: 'refund-settlement' },
			description: 'GoCart isolated E2E refund settlement',
		},
		{ idempotencyKey: `gocart-e2e-refund:${order.id}:${randomUUID()}` },
	);
	assert(paymentIntent.status === 'succeeded', `Stripe PaymentIntent did not succeed: ${paymentIntent.status}.`);

	const returnRequestId = randomUUID();
	const eventId = `gocart-e2e-stripe-refund:${randomUUID()}`;
	let returnItemId = '';
	let restocked = 0;
	let domainEventId: string | null = null;
	try {
		await db.paymentDetails.update({ where: { id: originalPayment.id }, data: { paymentInetntId: paymentIntent.id, providerCaptureId: null, paymentMethod: PaymentMethod.Stripe, status: paymentIntent.status, amount: order.total, currency: paymentDetails.currency } });
		await db.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.Paid, paymentMethod: PaymentMethod.Stripe } });
		const created = await db.returnRequest.create({
			data: {
				id: returnRequestId,
				status: ReturnRequestStatus.REFUND_PENDING,
				reason: ReturnReason.OTHER,
				resolution: ReturnResolution.REFUND,
				requestedAmount: item.price,
				requestedSubtotal: item.price,
				approvedAmount: item.price,
			currency: paymentDetails.currency,
				customerId: order.userId,
				orderId: order.id,
				orderGroupId: item.orderGroupId,
				storeId: item.orderGroup.storeId,
				paymentDetailsId: originalPayment.id,
				items: { create: { quantity: 1, receivedQuantity: 1, unitAmount: item.price, requestedAmount: item.price, activeRequestKey: `e2e-refund:${randomUUID()}`, orderItemId: item.id } },
			},
			select: { items: { select: { id: true } } },
		});
		returnItemId = created.items[0].id;

		const refund = await issueReturnRefundForAdmin(returnRequestId, admin.id);
		assert(refund.status === 'SUCCEEDED', `GoCart refund transaction did not succeed: ${refund.status}.`);
		assert(refund.provider === PaymentMethod.Stripe, 'Refund transaction provider was not recorded as Stripe.');
		assert(refund.providerRefundId, 'GoCart did not store the Stripe refund ID.');
		const providerRefund = await stripe.refunds.retrieve(refund.providerRefundId);
		assert(providerRefund.status === 'succeeded', `Stripe refund did not settle: ${providerRefund.status}.`);
		assert(providerRefund.amount === Math.round(item.price * 100), 'Stripe refund amount did not match the returned unit.');

		const refreshedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, { expand: ['latest_charge'] });
		const charge = typeof refreshedIntent.latest_charge === 'string' ? await stripe.charges.retrieve(refreshedIntent.latest_charge) : refreshedIntent.latest_charge;
		assert(charge && typeof charge !== 'string', 'Stripe did not return the refunded charge.');
		const webhookResult = await handleStripeEvent({ id: eventId, object: 'event', api_version: '2026-07-29.dahlia', created: Math.floor(Date.now() / 1000), data: { object: charge }, livemode: false, pending_webhooks: 0, request: null, type: 'charge.refunded' } as unknown as Stripe.Event);
		assert(!('ignored' in webhookResult) && webhookResult.duplicate === false, 'Stripe refund reconciliation event was not processed.');

		const settled = await db.returnRequest.findUniqueOrThrow({ where: { id: returnRequestId }, select: { status: true } });
		const reconciledOrder = await db.order.findUniqueOrThrow({ where: { id: order.id }, select: { paymentStatus: true } });
		assert(settled.status === ReturnRequestStatus.REFUNDED, 'The refund request was not settled locally.');
		assert(reconciledOrder.paymentStatus === PaymentStatus.PartiallyRefunded, 'The Stripe refund webhook did not reconcile the order payment status.');

		const inventoryResult = await reconcileReturnInventoryForAdmin({ returnRequestId, items: [{ returnItemId, restockable: true, quantity: 1 }] }, admin.id);
		restocked = inventoryResult.restocked;
		assert(restocked === 1, 'Inventory reconciliation did not restock the returned unit.');
		const replay = await reconcileReturnInventoryForAdmin({ returnRequestId, items: [{ returnItemId, restockable: true, quantity: 1 }] }, admin.id);
		assert(replay.restocked === 0, 'Inventory reconciliation was not idempotent.');

		const [returnItem, updatedSize, updatedOrderItem] = await Promise.all([
			db.returnItem.findUniqueOrThrow({ where: { id: returnItemId }, select: { restockedQuantity: true, restockable: true } }),
			db.size.findUniqueOrThrow({ where: { id: item.sizeId }, select: { quantity: true } }),
			db.orderItem.findUniqueOrThrow({ where: { id: item.id }, select: { status: true } }),
		]);
		assert(returnItem.restockedQuantity === 1 && returnItem.restockable === true, 'Returned inventory decision was not persisted.');
		assert(updatedSize.quantity === originalSize.quantity + 1, 'Inventory quantity did not increase by exactly one.');
		assert(updatedOrderItem.status === item.status, 'A partial refund incorrectly finalized the order item.');
		const domainEvent = await db.domainEvent.findFirst({ where: { eventKey: `return.refunded:Stripe:${refund.providerRefundId}` }, select: { id: true } });
		domainEventId = domainEvent?.id ?? null;
		console.log(`Stripe sandbox refund passed: paid ${paymentIntent.id}, refunded ${refund.providerRefundId}, inventory restocked 1 unit.`);
	} finally {
		if (domainEventId) {
			await db.notification.deleteMany({ where: { sourceEventId: domainEventId } });
			await db.domainEvent.delete({ where: { id: domainEventId } }).catch(() => undefined);
		}
		await db.paymentEvent.deleteMany({ where: { providerEventId: eventId } });
		await db.returnRequest.deleteMany({ where: { id: returnRequestId } });
		if (restocked > 0) await db.size.update({ where: { id: item.sizeId }, data: { quantity: { decrement: restocked } } });
		await db.paymentDetails.update({ where: { id: originalPayment.id }, data: { paymentInetntId: originalPayment.paymentInetntId, providerCaptureId: originalPayment.providerCaptureId, paymentMethod: originalPayment.paymentMethod, status: originalPayment.status, amount: originalPayment.amount, currency: originalPayment.currency } });
		await db.orderItem.update({ where: { id: item.id }, data: { status: originalItem.status, deliveredAt: originalItem.deliveredAt } });
		await db.orderGroup.update({ where: { id: item.orderGroupId }, data: { status: originalGroupStatus } });
		await db.order.update({ where: { id: order.id }, data: originalOrder });
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}).finally(() => db.$disconnect());
