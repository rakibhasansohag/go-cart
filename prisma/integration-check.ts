import {
	PaymentMethod,
	PrismaClient,
	ReturnReason,
	ReturnRequestStatus,
	ReturnResolution,
	Role,
} from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { deriveOrderStatus } from '../src/lib/orders/status-sync';
import { redeemCoins } from '../src/lib/loyalty/coins';
import { randomUUID } from 'node:crypto';
import { reconcilePaymentEvent } from '../src/lib/payments/reconcile';
import { handleStripeEvent } from '../src/lib/payments/stripe-events';
import { reconcileReturnInventoryForAdmin } from '../src/lib/returns/inventory';
import { searchProducts } from '../src/lib/search';
import { getProducts } from '../src/queries/product';
import { createSettlementsForPaidOrder } from '../src/lib/settlement/service';
import type Stripe from 'stripe';

assertSafeE2ERuntime();

const db = new PrismaClient();
const epsilon = 0.01;
const testUsers = {
	admin: process.env.E2E_ADMIN_EMAIL ?? 'rakibhasansohag133@gmail.com',
	seller: process.env.E2E_SELLER_EMAIL ?? 'drdevil133@gmail.com',
	customer: process.env.E2E_CUSTOMER_EMAIL ?? 'rakibdev133@gmail.com',
} as const;

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`[integration] ${message}`);
}

function closeEnough(actual: number, expected: number): boolean {
	return Math.abs(actual - expected) <= epsilon;
}

async function assertPostgresSearchAndBrowse() {
	const store = await db.store.findUniqueOrThrow({ where: { url: 'gocart-demo-store' }, select: { id: true } });
	const category = await db.category.findUniqueOrThrow({ where: { url: 'gocart-demo-category' }, select: { id: true } });
	const subCategory = await db.subCategory.findUniqueOrThrow({ where: { url: 'gocart-demo-subcategory' }, select: { id: true } });
	const offer = await db.offerTag.create({ data: { name: `Search Offer ${randomUUID()}`, url: `integration-search-${randomUUID()}` } });
	const productIds = [randomUUID(), randomUUID()];
	const variantIds = [randomUUID(), randomUUID(), randomUUID()];
	const sizeIds = [randomUUID(), randomUUID(), randomUUID()];
	const imageIds = [randomUUID(), randomUUID(), randomUUID()];
	const colorIds = [randomUUID(), randomUUID()];

	try {
		await db.product.createMany({
			data: [
				{
					id: productIds[0],
					name: 'Café Chronograph Watch',
					description: 'Accented search fixture with a precise chronograph movement.',
					brand: 'Élan',
					slug: `integration-search-watch-${productIds[0]}`,
					rating: 4.9,
					views: 1,
					storeId: store.id,
					categoryId: category.id,
					subCategoryId: subCategory.id,
					offerTagId: offer.id,
				},
				{
					id: productIds[1],
					name: 'Cafe Chronograph Case',
					description: 'A second chronograph fixture for explicit sort verification.',
					brand: 'GoCart Search',
					slug: `integration-search-case-${productIds[1]}`,
					rating: 4.1,
					views: 100,
					storeId: store.id,
					categoryId: category.id,
					subCategoryId: subCategory.id,
				},
			],
		});
		await db.productVariant.createMany({
			data: [
				{ id: variantIds[0], variantName: 'Standard', variantDescription: 'Crimson chronograph standard', variantImage: 'https://example.test/search-watch.png', slug: `integration-search-watch-standard-${variantIds[0]}`, sku: 'SEARCH-WATCH-001', keywords: 'cafe chronograph accented', weight: 1, productId: productIds[0] },
				{ id: variantIds[1], variantName: 'Rose Edition', variantDescription: 'Duplicate product variant search row', variantImage: 'https://example.test/search-watch-rose.png', slug: `integration-search-watch-rose-${variantIds[1]}`, sku: 'SEARCH-WATCH-002', keywords: 'cafe chronograph rose', weight: 1, productId: productIds[0] },
				{ id: variantIds[2], variantName: 'Standard', variantDescription: 'Protective chronograph case', variantImage: 'https://example.test/search-case.png', slug: `integration-search-case-standard-${variantIds[2]}`, sku: 'SEARCH-CASE-001', keywords: 'cafe chronograph case', weight: 1, productId: productIds[1] },
			],
		});
		await db.size.createMany({
			data: [
				{ id: sizeIds[0], size: 'Standard', quantity: 10, price: 75, productVariantId: variantIds[0] },
				{ id: sizeIds[1], size: 'Standard', quantity: 10, price: 80, productVariantId: variantIds[1] },
				{ id: sizeIds[2], size: 'Standard', quantity: 10, price: 25, productVariantId: variantIds[2] },
			],
		});
		await db.productVariantImage.createMany({
			data: imageIds.map((id, index) => ({ id, url: `https://example.test/search-${index}.png`, alt: 'Search fixture', order: 0, productVariantId: variantIds[index] })),
		});
		await db.color.createMany({
			data: [
				{ id: colorIds[0], name: 'Crimson', productVariantId: variantIds[0] },
				{ id: colorIds[1], name: 'Black', productVariantId: variantIds[2] },
			],
		});

		const accented = await searchProducts('Cafe');
		assert(accented.some((result) => result.name.startsWith('Café Chronograph Watch')), 'accent-insensitive autocomplete did not find the fixture');
		assert(new Set(accented.map((result) => result.link)).size === accented.length, 'autocomplete returned duplicate variant links');
		const typo = await searchProducts('Chronogrph');
		assert(typo.some((result) => result.name.includes('Chronograph')), 'trigram typo search did not find the fixture');
		const prefix = await searchProducts('Caf');
		assert(prefix.some((result) => result.name.includes('Chronograph')), 'short-prefix search did not find the fixture');

		const filtered = await getProducts({
			store: 'gocart-demo-store',
			category: 'gocart-demo-category',
			subCategory: 'gocart-demo-subcategory',
			offer: offer.url,
			search: 'Cafe',
			size: ['Standard'],
			minPrice: 50,
			maxPrice: 90,
			color: ['Crimson'],
		}, '', null, 10);
		assert(filtered.products.length === 1 && filtered.products[0].id === productIds[0], 'ranked search did not compose with store/category/offer/price/size/color filters');

		const rankedPage = await getProducts({ search: 'Chronograph' }, '', null, 1);
		assert(rankedPage.products.length === 1 && rankedPage.hasNextPage && rankedPage.nextCursor, 'ranked browse search did not return a cursor page');
		const nextRankedPage = await getProducts({ search: 'Chronograph' }, '', rankedPage.nextCursor, 1);
		assert(nextRankedPage.products.length === 1 && nextRankedPage.products[0].id !== rankedPage.products[0].id, 'relevance cursor repeated or skipped a tied search result');

		const popular = await getProducts({ search: 'Chronograph' }, 'most-popular', null, 10);
		assert(popular.products[0]?.id === productIds[1], 'explicit most-popular sort was replaced by relevance ordering');
		const topRated = await getProducts({ search: 'Chronograph' }, 'top-rated', null, 10);
		assert(topRated.products[0]?.id === productIds[0], 'explicit top-rated sort was not preserved');
	} finally {
		await db.color.deleteMany({ where: { id: { in: colorIds } } });
		await db.productVariantImage.deleteMany({ where: { id: { in: imageIds } } });
		await db.size.deleteMany({ where: { id: { in: sizeIds } } });
		await db.productVariant.deleteMany({ where: { id: { in: variantIds } } });
		await db.product.deleteMany({ where: { id: { in: productIds } } });
		await db.offerTag.delete({ where: { id: offer.id } });
	}
}

async function assertConcurrentPaymentReplay(orderId: string, amount: number) {
	const providerEventId = `integration-concurrent-payment:${orderId}`;
	const providerPaymentId = `integration-concurrent-pi:${orderId}`;
	const earnedIdempotencyKey = `earn:${providerEventId}`;
	const paymentDomainEventKey = `payment:succeeded:Stripe:${providerPaymentId}`;
	const gocoinDomainEventKey = `gocoin.earned:${earnedIdempotencyKey}`;

	const orderBefore = await db.order.findUniqueOrThrow({
		where: { id: orderId },
		select: { paymentStatus: true, paymentMethod: true },
	});
	const paymentBefore = await db.paymentDetails.findUnique({
		where: { orderId },
		select: {
			paymentInetntId: true,
			providerCaptureId: true,
			paymentMethod: true,
			status: true,
			amount: true,
			currency: true,
		},
	});

	try {
		const previousEarn = await db.loyaltyTransaction.findUnique({
			where: { idempotencyKey: earnedIdempotencyKey },
			select: { id: true, accountId: true, points: true },
		});
		if (previousEarn) {
			await db.loyaltyAccount.update({
				where: { id: previousEarn.accountId },
				data: {
					balance: { decrement: previousEarn.points },
					lifetimeEarned: { decrement: previousEarn.points },
				},
			});
			await db.loyaltyTransaction.delete({ where: { id: previousEarn.id } });
		}
		await db.domainEvent.deleteMany({
			where: { eventKey: { in: [paymentDomainEventKey, gocoinDomainEventKey] } },
		});
		await db.paymentEvent.deleteMany({ where: { providerEventId } });

		const results = await Promise.all([
			reconcilePaymentEvent({
				orderId,
				provider: PaymentMethod.Stripe,
				providerEventId,
				providerPaymentId,
				eventType: 'payment_intent.succeeded',
				providerStatus: 'succeeded',
				paymentStatus: 'Paid',
				amount,
				currency: 'USD',
				verifyOrderAmount: true,
			}),
			reconcilePaymentEvent({
				orderId,
				provider: PaymentMethod.Stripe,
				providerEventId,
				providerPaymentId,
				eventType: 'payment_intent.succeeded',
				providerStatus: 'succeeded',
				paymentStatus: 'Paid',
				amount,
				currency: 'USD',
				verifyOrderAmount: true,
			}),
		]);

		assert(results.filter((result) => !result.duplicate).length === 1, 'concurrent payment replay did not have exactly one primary result');
		assert(results.filter((result) => result.duplicate).length === 1, 'concurrent payment replay did not return exactly one duplicate result');
		assert(await db.paymentEvent.count({ where: { providerEventId } }) === 1, 'concurrent payment replay created duplicate payment events');
	} finally {
		const earned = await db.loyaltyTransaction.findUnique({
			where: { idempotencyKey: earnedIdempotencyKey },
			select: { id: true, accountId: true, points: true },
		});
		if (earned) {
			await db.loyaltyAccount.update({
				where: { id: earned.accountId },
				data: {
					balance: { decrement: earned.points },
					lifetimeEarned: { decrement: earned.points },
				},
			});
			await db.loyaltyTransaction.delete({ where: { id: earned.id } });
		}
		await db.domainEvent.deleteMany({
			where: { eventKey: { in: [paymentDomainEventKey, gocoinDomainEventKey] } },
		});
		await db.paymentEvent.deleteMany({ where: { providerEventId } });
		if (paymentBefore) {
			await db.paymentDetails.update({ where: { orderId }, data: paymentBefore });
		}
		await db.order.update({
			where: { id: orderId },
			data: { paymentStatus: orderBefore.paymentStatus, paymentMethod: orderBefore.paymentMethod },
		});
	}
}

async function assertConcurrentReturnOverlapProtection() {
	const fixture = await db.orderGroup.findFirst({
		where: { items: { some: {} } },
		select: {
			id: true,
			orderId: true,
			storeId: true,
			order: { select: { userId: true } },
			items: { take: 1, select: { id: true, price: true, totalPrice: true } },
		},
	});
	assert(fixture && fixture.items[0], 'a return overlap fixture is required');

	const [firstRequest, secondRequest] = await Promise.all([
		db.returnRequest.create({
			data: {
				reason: ReturnReason.OTHER,
				resolution: ReturnResolution.REFUND,
				requestedAmount: fixture.items[0].totalPrice,
				customerId: fixture.order.userId,
				orderId: fixture.orderId,
				orderGroupId: fixture.id,
				storeId: fixture.storeId,
			},
		}),
		db.returnRequest.create({
			data: {
				reason: ReturnReason.OTHER,
				resolution: ReturnResolution.REFUND,
				requestedAmount: fixture.items[0].totalPrice,
				customerId: fixture.order.userId,
				orderId: fixture.orderId,
				orderGroupId: fixture.id,
				storeId: fixture.storeId,
			},
		}),
	]);

	try {
		const activeRequestKey = `integration-return-overlap:${fixture.items[0].id}`;
		const outcomes = await Promise.allSettled([
			db.returnItem.create({
				data: {
					quantity: 1,
					unitAmount: fixture.items[0].price,
					requestedAmount: fixture.items[0].totalPrice,
					activeRequestKey,
					returnRequestId: firstRequest.id,
					orderItemId: fixture.items[0].id,
				},
			}),
			db.returnItem.create({
				data: {
					quantity: 1,
					unitAmount: fixture.items[0].price,
					requestedAmount: fixture.items[0].totalPrice,
					activeRequestKey,
					returnRequestId: secondRequest.id,
					orderItemId: fixture.items[0].id,
				},
			}),
		]);
		assert(outcomes.filter((outcome) => outcome.status === 'fulfilled').length === 1, 'return overlap allowed more than one active request');
		assert(outcomes.filter((outcome) => outcome.status === 'rejected').length === 1, 'return overlap did not enforce the unique active request key');
	} finally {
		await db.returnRequest.deleteMany({ where: { id: { in: [firstRequest.id, secondRequest.id] } } });
	}
}

async function assertStripeRefundWebhookSettlement() {
	const fixture = await db.order.findFirst({
		where: { paymentStatus: 'Paid', user: { email: testUsers.customer } },
		select: {
			id: true,
			total: true,
			paymentStatus: true,
			paymentMethod: true,
			orderStatus: true,
			userId: true,
			paymentDetails: {
				select: {
					id: true,
					paymentInetntId: true,
					providerCaptureId: true,
					paymentMethod: true,
					status: true,
					amount: true,
					currency: true,
				},
			},
			groups: { take: 1, select: { id: true, storeId: true, items: { take: 1, select: { id: true, quantity: true, price: true, totalPrice: true } } } },
		},
	});
	assert(fixture?.paymentDetails && fixture.groups[0]?.items[0], 'a paid order with payment details is required for refund webhook coverage');

	const group = fixture.groups[0];
	const orderItem = group.items[0];
	const eventId = `integration-stripe-refund:${fixture.id}:${randomUUID()}`;
	const returnRequest = await db.returnRequest.create({
		data: {
			status: ReturnRequestStatus.REFUND_PENDING,
			reason: ReturnReason.OTHER,
			resolution: ReturnResolution.REFUND,
			requestedAmount: fixture.total,
			approvedAmount: fixture.total,
			currency: fixture.paymentDetails.currency,
			customerId: fixture.userId,
			orderId: fixture.id,
			orderGroupId: group.id,
			storeId: group.storeId,
			paymentDetailsId: fixture.paymentDetails.id,
			items: {
				create: {
					quantity: orderItem.quantity,
					unitAmount: orderItem.price,
					requestedAmount: orderItem.totalPrice,
					activeRequestKey: `integration-refund-return:${fixture.id}:${randomUUID()}`,
					orderItemId: orderItem.id,
				},
			},
		},
	});
	await db.refundTransaction.create({
		data: {
			provider: PaymentMethod.Stripe,
			idempotencyKey: `integration-refund:${returnRequest.id}`,
			status: 'PROCESSING',
			amount: fixture.total,
			currency: fixture.paymentDetails.currency,
			returnRequestId: returnRequest.id,
			paymentDetailsId: fixture.paymentDetails.id,
		},
	});

	const event = {
		id: eventId,
		object: 'event',
		api_version: '2025-03-31.basil',
		created: Math.floor(Date.now() / 1000),
		data: {
			object: {
				id: `integration-charge:${fixture.id}`,
				object: 'charge',
				amount: Math.round(fixture.total * 100),
				amount_refunded: Math.round(fixture.total * 100),
				currency: fixture.paymentDetails.currency.toLowerCase(),
				status: 'succeeded',
				payment_intent: fixture.paymentDetails.paymentInetntId,
				metadata: { orderId: fixture.id },
			},
		},
		livemode: false,
		pending_webhooks: 0,
		request: null,
		type: 'charge.refunded',
	} as unknown as Stripe.Event;

	try {
		const first = await handleStripeEvent(event);
		assert(!('ignored' in first) && first.duplicate === false, 'Stripe refund webhook was not processed as a new event');
		const second = await handleStripeEvent(event);
		assert(!('ignored' in second) && second.duplicate === true, 'Stripe refund webhook replay was not idempotent');

		const [settledRequest, refund, refreshedOrder, paymentEventCount, domainEvents] = await Promise.all([
			db.returnRequest.findUnique({ where: { id: returnRequest.id }, select: { status: true, resolvedAt: true } }),
			db.refundTransaction.findUnique({ where: { idempotencyKey: `integration-refund:${returnRequest.id}` }, select: { status: true, processedAt: true } }),
			db.order.findUnique({ where: { id: fixture.id }, select: { paymentStatus: true } }),
			db.paymentEvent.count({ where: { providerEventId: eventId } }),
			db.domainEvent.findMany({ where: { eventKey: `return.refunded:${eventId}` }, select: { id: true } }),
		]);
		assert(settledRequest && settledRequest.status === ReturnRequestStatus.REFUNDED && settledRequest.resolvedAt !== null, 'Stripe refund webhook did not settle the return request');
		assert(refund?.status === 'SUCCEEDED' && refund.processedAt !== null, 'Stripe refund webhook did not complete the refund transaction');
		assert(refreshedOrder?.paymentStatus === 'Refunded', 'Stripe refund webhook did not reconcile the order payment status');
		assert(paymentEventCount === 1, 'Stripe refund webhook replay created a duplicate payment event');
		assert(domainEvents.length === 1, 'Stripe refund webhook replay created duplicate refund domain events');
	} finally {
		const domainEvents = await db.domainEvent.findMany({ where: { eventKey: `return.refunded:${eventId}` }, select: { id: true } });
		if (domainEvents.length > 0) await db.notification.deleteMany({ where: { sourceEventId: { in: domainEvents.map((entry) => entry.id) } } });
		await db.domainEvent.deleteMany({ where: { id: { in: domainEvents.map((entry) => entry.id) } } });
		await db.paymentEvent.deleteMany({ where: { providerEventId: eventId } });
		await db.returnRequest.delete({ where: { id: returnRequest.id } });
		await db.paymentDetails.update({ where: { id: fixture.paymentDetails.id }, data: fixture.paymentDetails });
		await db.order.update({ where: { id: fixture.id }, data: { paymentStatus: fixture.paymentStatus, paymentMethod: fixture.paymentMethod, orderStatus: fixture.orderStatus } });
	}
}

async function assertSettlementLedgerAndTransferReplay() {
	const order = await db.order.findFirst({
		where: { paymentStatus: 'Paid', user: { email: testUsers.customer } },
		select: { id: true, groups: { select: { id: true } } },
	});
	assert(order?.groups.length, 'a paid order with groups is required for settlement coverage');
	const settlements = await createSettlementsForPaidOrder(order.id);
	assert(settlements.length === order.groups.length, 'every paid order group must create one settlement');
	for (const settlement of settlements) {
		const replay = await createSettlementsForPaidOrder(order.id);
		assert(replay.find((item) => item.id === settlement.id), 'settlement creation was not idempotent');
		const entries = await db.settlementLedgerEntry.findMany({ where: { settlementId: settlement.id, entryType: 'INITIAL' } });
		assert(entries.length === 1, 'settlement replay created a duplicate initial ledger entry');
		assert(settlement.currency === 'USD', 'settlement currency must be canonical USD');
		assert(settlement.remainingPayableCents <= settlement.sellerPayableCents, 'remaining seller payable cannot exceed the immutable snapshot');
	}

	const settlement = settlements[0];
	const originalAccount = await db.sellerPaymentAccount.findUnique({ where: { userId: settlement.sellerId } });
	const webhookAccount = await db.sellerPaymentAccount.upsert({
		where: { userId: settlement.sellerId },
		update: { providerAccountId: `acct_integration_${randomUUID().replaceAll('-', '')}`, status: 'PENDING', transfersCapability: 'pending' },
		create: { userId: settlement.sellerId, providerAccountId: `acct_integration_${randomUUID().replaceAll('-', '')}`, status: 'PENDING', transfersCapability: 'pending' },
	});
	const accountEvent = {
		id: `integration-account-updated:${randomUUID()}`,
		object: 'event',
		created: Math.floor(Date.now() / 1000),
		data: { object: { id: webhookAccount.providerAccountId, object: 'account', country: 'US', details_submitted: true, capabilities: { transfers: 'active' } } },
		livemode: false,
		pending_webhooks: 0,
		request: null,
		type: 'account.updated',
	} as unknown as Stripe.Event;
	try {
		const firstAccount = await handleStripeEvent(accountEvent);
		const secondAccount = await handleStripeEvent(accountEvent);
		assert(!('ignored' in firstAccount) && firstAccount.duplicate === false, 'account webhook was not processed');
		assert(!('ignored' in secondAccount) && secondAccount.duplicate === true, 'account webhook replay was not idempotent');
		const refreshedAccount = await db.sellerPaymentAccount.findUniqueOrThrow({ where: { userId: settlement.sellerId } });
		assert(refreshedAccount.status === 'ACTIVE' && refreshedAccount.transfersCapability === 'active', 'account webhook did not activate transfers');
		const payoutEvent = { id: `integration-payout:${randomUUID()}`, object: 'event', account: webhookAccount.providerAccountId, created: Math.floor(Date.now() / 1000), data: { object: { id: `po_integration_${randomUUID().replaceAll('-', '')}`, object: 'payout', amount: 1250, currency: 'usd', status: 'paid', arrival_date: Math.floor(Date.now() / 1000) } }, livemode: false, pending_webhooks: 0, request: null, type: 'payout.paid' } as unknown as Stripe.Event;
		const firstPayout = await handleStripeEvent(payoutEvent);
		const secondPayout = await handleStripeEvent(payoutEvent);
		assert(!('ignored' in firstPayout) && firstPayout.duplicate === false, 'payout webhook was not processed');
		assert(!('ignored' in secondPayout) && secondPayout.duplicate === true, 'payout webhook replay was not idempotent');
		assert(await db.sellerPayoutRecord.count({ where: { lastEventId: payoutEvent.id } }) === 1, 'payout webhook created duplicate reconciliation records');
		await db.sellerPayoutRecord.deleteMany({ where: { lastEventId: payoutEvent.id } });
	} finally {
		await db.sellerPaymentAccountEvent.deleteMany({ where: { providerEventId: accountEvent.id } });
		if (originalAccount) await db.sellerPaymentAccount.update({ where: { userId: settlement.sellerId }, data: { providerAccountId: originalAccount.providerAccountId, status: originalAccount.status, transfersCapability: originalAccount.transfersCapability, country: originalAccount.country, detailsSubmitted: originalAccount.detailsSubmitted } });
		else await db.sellerPaymentAccount.delete({ where: { userId: settlement.sellerId } });
	}

	const original = await db.sellerSettlement.findUniqueOrThrow({ where: { id: settlement.id }, select: { status: true, reversedCents: true, remainingPayableCents: true, providerTransferId: true } });
	const providerTransferId = `tr_integration_${randomUUID().replaceAll('-', '')}`;
	await db.sellerSettlement.update({ where: { id: settlement.id }, data: { providerTransferId } });
	const event = {
		id: `integration-transfer-reversal:${randomUUID()}`,
		object: 'event',
		created: Math.floor(Date.now() / 1000),
		data: { object: { id: providerTransferId, object: 'transfer', amount: 1000, amount_reversed: 250 } },
		livemode: false,
		pending_webhooks: 0,
		request: null,
		type: 'transfer.reversed',
	} as unknown as Stripe.Event;
	try {
		const first = await handleStripeEvent(event);
		const second = await handleStripeEvent(event);
		assert(!('ignored' in first) && first.duplicate === false, 'transfer reversal was not processed');
		assert(!('ignored' in second) && second.duplicate === true, 'transfer reversal replay was not idempotent');
		const refreshed = await db.sellerSettlement.findUniqueOrThrow({ where: { id: settlement.id }, select: { status: true, reversedCents: true, remainingPayableCents: true } });
		assert(refreshed.status === 'REVERSED' && refreshed.reversedCents === original.reversedCents + 250, 'transfer reversal did not update settlement state');
		assert(refreshed.remainingPayableCents === original.remainingPayableCents - 250, 'transfer reversal did not create the seller debit');
	} finally {
		await db.settlementLedgerEntry.deleteMany({ where: { idempotencyKey: event.id ? `stripe:transfer-reversal:${event.id}` : '' } });
		await db.sellerSettlement.update({ where: { id: settlement.id }, data: { providerTransferId: original.providerTransferId, status: original.status, reversedCents: original.reversedCents, remainingPayableCents: original.remainingPayableCents } });
	}
}

async function assertReturnInventoryReconciliation() {
	const admin = await db.user.findUnique({ where: { email: testUsers.admin }, select: { id: true } });
	assert(admin, 'demo admin is required for return inventory coverage');
	const fixture = await db.orderItem.findFirst({
		where: { status: 'Delivered', quantity: { gte: 2 }, orderGroup: { order: { user: { email: testUsers.customer } } } },
		select: {
			id: true,
			quantity: true,
			price: true,
			totalPrice: true,
			sizeId: true,
			status: true,
			orderGroup: { select: { id: true, orderId: true, storeId: true, status: true, order: { select: { userId: true, orderStatus: true } } } },
		},
	});
	assert(fixture, 'a delivered multi-unit order item is required for return inventory coverage');

	const originalSize = await db.size.findUniqueOrThrow({ where: { id: fixture.sizeId }, select: { quantity: true } });
	const firstQuantity = 1;
	const secondQuantity = fixture.quantity - firstQuantity;
	const createReturn = (quantity: number, status: ReturnRequestStatus, activeRequestKey?: string) => db.returnRequest.create({
		data: {
			status,
			reason: ReturnReason.DAMAGED,
			resolution: ReturnResolution.REFUND,
			requestedAmount: fixture.price * quantity,
			approvedAmount: fixture.price * quantity,
			customerId: fixture.orderGroup.order.userId,
			orderId: fixture.orderGroup.orderId,
			orderGroupId: fixture.orderGroup.id,
			storeId: fixture.orderGroup.storeId,
			resolvedAt: status === ReturnRequestStatus.REFUNDED ? new Date() : null,
			items: { create: { quantity, receivedQuantity: quantity, unitAmount: fixture.price, requestedAmount: fixture.price * quantity, activeRequestKey: activeRequestKey ?? null, orderItemId: fixture.id } },
		},
		select: { id: true, items: { select: { id: true } } },
	});
	const firstReturn = await createReturn(firstQuantity, ReturnRequestStatus.REFUNDED);
	const secondReturn = await createReturn(secondQuantity, ReturnRequestStatus.REQUESTED, `integration-partial-return:${fixture.id}:${randomUUID()}`);

	try {
		const firstInput = { returnRequestId: firstReturn.id, items: [{ returnItemId: firstReturn.items[0].id, restockable: true, quantity: firstQuantity }] };
		const secondInput = { returnRequestId: secondReturn.id, items: [{ returnItemId: secondReturn.items[0].id, restockable: true, quantity: secondQuantity }] };
		const firstResult = await reconcileReturnInventoryForAdmin(firstInput, admin.id);
		const afterFirst = await db.size.findUniqueOrThrow({ where: { id: fixture.sizeId }, select: { quantity: true } });
		const partialItem = await db.orderItem.findUniqueOrThrow({ where: { id: fixture.id }, select: { status: true } });
		assert(firstResult.restocked === firstQuantity, 'partial return did not restock only the received quantity');
		assert(afterFirst.quantity === originalSize.quantity + firstQuantity, 'partial return changed inventory by the wrong amount');
		assert(partialItem.status === 'Delivered', 'partial return incorrectly marked the order item terminal');

		const firstReplay = await reconcileReturnInventoryForAdmin(firstInput, admin.id);
		const afterFirstReplay = await db.size.findUniqueOrThrow({ where: { id: fixture.sizeId }, select: { quantity: true } });
		assert(firstReplay.restocked === 0 && afterFirstReplay.quantity === afterFirst.quantity, 'partial restock replay was not idempotent');

		await db.returnRequest.update({ where: { id: secondReturn.id }, data: { status: ReturnRequestStatus.REFUNDED, resolvedAt: new Date() } });
		await db.returnItem.update({ where: { id: secondReturn.items[0].id }, data: { activeRequestKey: null } });
		const secondResult = await reconcileReturnInventoryForAdmin(secondInput, admin.id);
		const finalItem = await db.orderItem.findUniqueOrThrow({ where: { id: fixture.id }, select: { status: true } });
		const finalGroup = await db.orderGroup.findUniqueOrThrow({ where: { id: fixture.orderGroup.id }, select: { status: true, order: { select: { orderStatus: true } } } });
		assert(secondResult.restocked === secondQuantity, 'final return did not restock the remaining quantity');
		assert(finalItem.status === 'Refunded', 'fully settled return did not mark the order item refunded');
		assert(finalGroup.status === 'Refunded' && finalGroup.order.orderStatus === 'Refunded', 'return settlement did not propagate parent order statuses');

		const secondReplay = await reconcileReturnInventoryForAdmin(secondInput, admin.id);
		const finalSize = await db.size.findUniqueOrThrow({ where: { id: fixture.sizeId }, select: { quantity: true } });
		assert(secondReplay.restocked === 0 && finalSize.quantity === originalSize.quantity + fixture.quantity, 'final restock replay was not idempotent');
	} finally {
		await db.returnRequest.deleteMany({ where: { id: { in: [firstReturn.id, secondReturn.id] } } });
		await db.size.update({ where: { id: fixture.sizeId }, data: { quantity: originalSize.quantity } });
		await db.orderItem.update({ where: { id: fixture.id }, data: { status: fixture.status } });
		await db.orderGroup.update({ where: { id: fixture.orderGroup.id }, data: { status: fixture.orderGroup.status } });
		await db.order.update({ where: { id: fixture.orderGroup.orderId }, data: { orderStatus: fixture.orderGroup.order.orderStatus } });
	}
}

async function main() {
	const users = await db.user.findMany({
		where: { email: { in: [testUsers.customer, testUsers.seller, testUsers.admin] } },
		select: { email: true, role: true },
	});
	const roles = new Map(users.map((user) => [user.email, user.role]));
	assert(roles.get(testUsers.customer) === Role.USER, 'demo customer role is incorrect');
	assert(roles.get(testUsers.seller) === Role.SELLER, 'demo seller role is incorrect');
	assert(roles.get(testUsers.admin) === Role.ADMIN, 'demo admin role is incorrect');

	const orderCount = await db.order.count();
	assert(orderCount >= 1000, `expected at least 1000 demo orders, found ${orderCount}`);

	const orders = await db.order.findMany({
		take: 25,
		orderBy: { createdAt: 'asc' },
		select: {
			total: true,
			orderStatus: true,
			groups: {
				select: {
					status: true,
					total: true,
					subTotal: true,
					shippingFees: true,
					items: { select: { price: true, quantity: true, shippingFee: true, totalPrice: true } },
				},
			},
		},
	});
	for (const order of orders) {
		const groupTotal = order.groups.reduce((sum, group) => sum + group.total, 0);
		assert(closeEnough(order.total, groupTotal), 'order total does not equal group totals');
		assert(deriveOrderStatus(order.groups.map((group) => group.status)) === order.orderStatus, 'order status does not match group statuses');
		for (const group of order.groups) {
			assert(closeEnough(group.total, group.subTotal + group.shippingFees), 'group total invariant failed');
			for (const item of group.items) {
				assert(item.quantity > 0, 'order item quantity must be positive');
				assert(closeEnough(item.totalPrice, item.price * item.quantity + item.shippingFee), 'order item total invariant failed');
			}
		}
	}

	const invalidSizes = await db.size.count({ where: { quantity: { lt: 0 } } });
	assert(invalidSizes === 0, `found ${invalidSizes} inventory sizes with negative quantity`);

	const paidOrders = await db.order.findMany({
		where: { paymentStatus: 'Paid' },
		take: 25,
		select: { total: true, paymentMethod: true, paymentDetails: { select: { amount: true, currency: true } } },
	});
	for (const order of paidOrders) {
		assert(order.paymentMethod !== null, 'paid order is missing a payment method');
		assert(order.paymentDetails !== null, 'paid order is missing payment details');
		assert(closeEnough(order.paymentDetails.amount, order.total), 'paid amount does not match order total');
		assert(Boolean(order.paymentDetails.currency), 'payment currency is missing');
	}
	const reconciliationOrder = await db.order.findFirst({
		where: { paymentStatus: 'Paid', user: { email: testUsers.customer } },
		select: { id: true, total: true },
	});
	assert(reconciliationOrder, 'a paid demo order is required for payment reconciliation coverage');
	const reconciliationEventId = `integration-payment:${reconciliationOrder.id}`;
	await reconcilePaymentEvent({
		orderId: reconciliationOrder.id,
		provider: PaymentMethod.Stripe,
		providerEventId: reconciliationEventId,
		providerPaymentId: `integration-pi:${reconciliationOrder.id}`,
		eventType: 'payment_intent.succeeded',
		providerStatus: 'succeeded',
		paymentStatus: 'Paid',
		amount: reconciliationOrder.total,
		currency: 'USD',
		verifyOrderAmount: true,
	});
	const duplicateReconciliation = await reconcilePaymentEvent({
		orderId: reconciliationOrder.id,
		provider: PaymentMethod.Stripe,
		providerEventId: reconciliationEventId,
		providerPaymentId: `integration-pi:${reconciliationOrder.id}`,
		eventType: 'payment_intent.succeeded',
		providerStatus: 'succeeded',
		paymentStatus: 'Paid',
		amount: reconciliationOrder.total,
		currency: 'USD',
		verifyOrderAmount: true,
	});
	assert(duplicateReconciliation.duplicate === true, 'payment reconciliation replay was not idempotent');
	await assertConcurrentPaymentReplay(reconciliationOrder.id, reconciliationOrder.total);
	const duplicateEventKeys = await db.paymentEvent.groupBy({
		by: ['providerEventId'],
		_count: { providerEventId: true },
		having: { providerEventId: { _count: { gt: 1 } } },
	});
	assert(duplicateEventKeys.length === 0, 'duplicate payment webhook event IDs detected');
	await assertStripeRefundWebhookSettlement();
	await assertSettlementLedgerAndTransferReplay();

	const limitedCoupons = await db.coupon.findMany({
		where: { maxUses: { gt: 0 } },
		select: {
			code: true,
			maxUses: true,
			maxUsesPerUser: true,
			orders: {
				where: { order: { paymentStatus: 'Paid' } },
				select: { order: { select: { userId: true } } },
			},
		},
	});
	for (const coupon of limitedCoupons) {
		assert(coupon.orders.length <= coupon.maxUses, `coupon ${coupon.code} exceeded maxUses`);
		const usesByUser = new Map<string, number>();
		for (const redemption of coupon.orders) {
			const count = (usesByUser.get(redemption.order.userId) ?? 0) + 1;
			assert(count <= coupon.maxUsesPerUser, `coupon ${coupon.code} exceeded maxUsesPerUser`);
			usesByUser.set(redemption.order.userId, count);
		}
	}

	const returnItems = await db.returnItem.findMany({
		select: {
			quantity: true,
			receivedQuantity: true,
			restockedQuantity: true,
			requestedAmount: true,
			approvedAmount: true,
		},
	});
	for (const item of returnItems) {
		assert(item.quantity > 0, 'return quantity must be positive');
		assert(item.receivedQuantity >= 0 && item.restockedQuantity >= 0, 'return quantities cannot be negative');
		assert(item.restockedQuantity <= item.receivedQuantity, 'restocked quantity exceeds received quantity');
		assert(item.requestedAmount >= 0 && (item.approvedAmount ?? 0) >= 0, 'return amounts cannot be negative');
	}
	await assertConcurrentReturnOverlapProtection();
	await assertReturnInventoryReconciliation();
	const refunds = await db.refundTransaction.findMany({
		select: { amount: true, status: true, processedAt: true, idempotencyKey: true },
	});
	assert(new Set(refunds.map((refund) => refund.idempotencyKey)).size === refunds.length, 'duplicate refund idempotency keys detected');
	for (const refund of refunds) {
		assert(refund.amount > 0, 'refund amount must be positive');
		if (refund.status === 'SUCCEEDED') assert(refund.processedAt !== null, 'successful refund is missing processedAt');
	}

	const shipments = await db.shipment.findMany({
		select: {
			id: true,
			packageAssignments: { select: { orderGroupId: true } },
			items: { select: { quantity: true, orderItemId: true, orderItem: { select: { quantity: true } } } },
		},
	});
	assert(shipments.every((shipment) => shipment.packageAssignments.length > 0), 'shipment is missing a package assignment');
	const shipmentPackagePairs = shipments.flatMap((shipment) => shipment.packageAssignments.map((assignment) => `${shipment.id}:${assignment.orderGroupId}`));
	assert(new Set(shipmentPackagePairs).size === shipmentPackagePairs.length, 'duplicate shipment/package assignments detected');
	const shippedByItem = new Map<string, number>();
	for (const shipment of shipments) {
		for (const item of shipment.items) {
			assert(item.quantity > 0, 'shipment item quantity must be positive');
			const shipped = (shippedByItem.get(item.orderItemId) ?? 0) + item.quantity;
			assert(shipped <= item.orderItem.quantity, 'shipment quantity exceeds ordered quantity');
			shippedByItem.set(item.orderItemId, shipped);
		}
	}
	const itemShipmentCounts = new Map<string, number>();
	for (const shipment of shipments) {
		for (const item of shipment.items) itemShipmentCounts.set(item.orderItemId, (itemShipmentCounts.get(item.orderItemId) ?? 0) + 1);
	}
	assert([...itemShipmentCounts.values()].some((count) => count > 1), 'split shipment fixture is missing');
	assert(shipments.some((shipment) => shipment.packageAssignments.length > 1), 'consolidated shipment fixture is missing');
	const trackingEvents = await db.trackingEvent.findMany({ select: { providerEventId: true } });
	const eventKeys = trackingEvents.map((event) => event.providerEventId).filter(Boolean);
	assert(new Set(eventKeys).size === eventKeys.length, 'duplicate carrier event IDs detected');
	const deliveryAttempts = await db.deliveryAttempt.findMany({ select: { shipmentId: true, attemptNumber: true } });
	assert(deliveryAttempts.every((attempt) => attempt.attemptNumber > 0), 'delivery attempt number must be positive');
	assert((await db.trackingEvent.count({ where: { status: 'DELIVERY_ATTEMPT_FAILED' } })) > 0, 'failed delivery tracking fixture is missing');

	const loyaltyAccounts = await db.loyaltyAccount.findMany({ select: { balance: true, lifetimeEarned: true } });
	for (const account of loyaltyAccounts) {
		assert(account.balance >= 0, 'GoCoins balance cannot be negative');
		assert(account.lifetimeEarned >= account.balance, 'GoCoins lifetime earned cannot be below balance');
	}
	const loyaltyTransactions = await db.loyaltyTransaction.findMany({ select: { idempotencyKey: true, points: true } });
	assert(new Set(loyaltyTransactions.map((transaction) => transaction.idempotencyKey)).size === loyaltyTransactions.length, 'duplicate GoCoins idempotency keys detected');
	assert(loyaltyTransactions.every((transaction) => transaction.points > 0), 'GoCoins transaction points must be positive');

	const domainEvents = await db.domainEvent.findMany({ select: { eventKey: true } });
	assert(new Set(domainEvents.map((event) => event.eventKey)).size === domainEvents.length, 'duplicate domain event keys detected');
	const notifications = await db.notification.findMany({ select: { sourceEventId: true, recipientId: true } });
	assert(new Set(notifications.map((notification) => `${notification.sourceEventId}:${notification.recipientId}`)).size === notifications.length, 'duplicate notifications detected');
	await assertPostgresSearchAndBrowse();

	const raceEmail = `integration-race-${randomUUID()}@example.test`;
	const raceUser = await db.user.create({ data: { name: 'Integration Race User', email: raceEmail, picture: '', role: Role.USER } });
	try {
		await db.loyaltyAccount.create({ data: { userId: raceUser.id, balance: 100, lifetimeEarned: 100 } });
		const raceOrders = await db.order.findMany({ take: 2, select: { id: true } });
		const raceResults = await Promise.all(raceOrders.map((order, index) =>
			db.$transaction((tx) => redeemCoins(tx, {
				userId: raceUser.id,
				orderId: order.id,
				coins: 100,
				idempotencyKey: `integration-race:${raceUser.id}:${index}`,
			})).then(() => true).catch(() => false),
		));
		assert(raceResults.filter(Boolean).length === 1, 'concurrent GoCoins redemption was not serialized');
		const raceAccount = await db.loyaltyAccount.findUniqueOrThrow({ where: { userId: raceUser.id } });
		assert(raceAccount.balance === 0, 'concurrent GoCoins redemption left an incorrect balance');
	} finally {
		await db.user.delete({ where: { id: raceUser.id } });
	}

	console.log(`Integration checks passed: ${orderCount} orders, permissions, totals, coupons, transitions, inventory, payments, returns, shipments, GoCoins, notifications, and PostgreSQL search/browse ranking.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
}).finally(() => db.$disconnect());
