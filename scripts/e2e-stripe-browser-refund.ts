import { createHash } from 'node:crypto';
import { PaymentMethod, PaymentStatus, ReturnRequestStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { db } from '../src/lib/db';
import { getStripeClient } from '../src/lib/payments/stripe-client';
import { handleStripeEvent } from '../src/lib/payments/stripe-events';

function demoFixtureId(kind: string, index: number) {
	const hex = createHash('sha256').update(`gocart-demo:${kind}:${index}`).digest('hex').slice(0, 32);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function getFixture() {
	const item = await db.orderItem.findUnique({
		where: { id: demoFixtureId('item', 5) },
		include: {
			orderGroup: {
				include: {
					order: { include: { paymentDetails: true } },
					store: { select: { id: true } },
				},
			},
		},
	});
	assert(item, 'The deterministic delivered return item is missing.');
	assert(item.orderGroup.order.paymentDetails, 'The deterministic payment fixture is missing.');
	return { item, order: item.orderGroup.order, paymentDetails: item.orderGroup.order.paymentDetails };
}

async function setup() {
	if (process.env.E2E_BROWSER_REFUND !== 'true') throw new Error('Set E2E_BROWSER_REFUND=true to run the browser refund test.');
	if (process.env.E2E_PROVIDER_MODE !== 'sandbox') throw new Error('The browser refund test requires E2E_PROVIDER_MODE=sandbox.');

	const { item, order, paymentDetails } = await getFixture();
	const stripe = getStripeClient();
	const intent = await stripe.paymentIntents.create(
		{
			amount: Math.round(order.total * 100),
			currency: paymentDetails.currency.toLowerCase(),
			automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
			payment_method: 'pm_card_visa',
			confirm: true,
			metadata: { orderId: order.id, e2ePurpose: 'browser-refund' },
			description: 'GoCart isolated browser refund test',
		},
		{ idempotencyKey: `gocart-e2e-browser-refund:${order.id}:${Date.now()}` },
	);
	assert(intent.status === 'succeeded', `Stripe PaymentIntent did not succeed: ${intent.status}.`);

	const returnRequestId = demoFixtureId('return', 5);
	await db.paymentDetails.update({
		where: { id: paymentDetails.id },
		data: { paymentInetntId: intent.id, providerCaptureId: null, paymentMethod: PaymentMethod.Stripe, status: intent.status, amount: order.total, currency: paymentDetails.currency },
	});
	await db.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.Paid, paymentMethod: PaymentMethod.Stripe } });
	await db.returnRequest.update({
		where: { id: returnRequestId },
		data: {
			status: ReturnRequestStatus.REFUND_PENDING,
			approvedAmount: item.price,
			items: { updateMany: { where: { orderItemId: item.id }, data: { receivedQuantity: 1, restockedQuantity: 0, restockable: null } } },
		},
	});

	console.log(`Prepared browser refund fixture with Stripe sandbox payment ${intent.id}.`);
}

async function verify() {
	const { order, paymentDetails } = await getFixture();
	const request = await db.returnRequest.findUnique({
		where: { id: demoFixtureId('return', 5) },
		include: { items: true, transactions: { orderBy: { createdAt: 'desc' } } },
	});
	assert(request?.status === ReturnRequestStatus.REFUNDED, 'The browser did not settle the return request as Refunded.');
	const transaction = request.transactions[0];
	assert(transaction?.status === 'SUCCEEDED', 'The browser refund transaction did not succeed.');
	assert(transaction.provider === PaymentMethod.Stripe, 'The browser refund transaction provider is not Stripe.');
	assert(transaction.providerRefundId, 'The browser refund did not store a provider refund ID.');
	assert(request.items[0]?.restockedQuantity === 1 && request.items[0].restockable === true, 'The browser did not persist one restocked unit.');

	const stripe = getStripeClient();
	const providerRefund = await stripe.refunds.retrieve(transaction.providerRefundId);
	assert(providerRefund.status === 'succeeded', `Stripe refund did not settle: ${providerRefund.status}.`);
	const intent = await stripe.paymentIntents.retrieve(paymentDetails.paymentInetntId, { expand: ['latest_charge'] });
	const charge = typeof intent.latest_charge === 'string' ? await stripe.charges.retrieve(intent.latest_charge) : intent.latest_charge;
	assert(charge && typeof charge !== 'string', 'Stripe did not return the refunded charge.');
	const eventId = `gocart-e2e-browser-refund:${request.id}`;
	const eventResult = await handleStripeEvent({ id: eventId, object: 'event', api_version: '2026-07-29.dahlia', created: Math.floor(Date.now() / 1000), data: { object: charge }, livemode: false, pending_webhooks: 0, request: null, type: 'charge.refunded' } as unknown as Stripe.Event);
	assert(!('ignored' in eventResult), 'Stripe browser refund webhook reconciliation was ignored.');
	const refreshed = await db.order.findUniqueOrThrow({ where: { id: order.id }, select: { paymentStatus: true } });
	assert(refreshed.paymentStatus === PaymentStatus.PartiallyRefunded, 'The browser refund webhook did not reconcile partial payment status.');
	console.log(`Browser refund verified: ${transaction.providerRefundId}, one unit restocked, payment status PartiallyRefunded.`);
}

const action = process.argv[2];
const task = action === 'setup' ? setup : action === 'verify' ? verify : null;
if (!task) throw new Error('Use setup or verify.');

task()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
