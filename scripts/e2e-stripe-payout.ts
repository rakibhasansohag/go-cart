import { createHash, randomUUID } from 'node:crypto';
import {
	PaymentAccountStatus,
	PayoutBatchStatus,
	SettlementLedgerEntryType,
	SettlementStatus,
} from '@prisma/client';
import type Stripe from 'stripe';

import { db } from '../src/lib/db';
import { refreshStripeAccountBalance } from '../src/lib/payments/connect';
import { getStripeClient } from '../src/lib/payments/stripe-client';
import { handleStripeEvent } from '../src/lib/payments/stripe-events';
import {
	approvePayoutBatch,
	createSettlementForOrderGroup,
	createWeeklyPayoutBatch,
	processPayoutBatch,
	refreshEligibleSettlements,
	retrySettlement,
	updatePlatformSettings,
} from '../src/lib/settlement/service';

function fixtureId(kind: string, index: number) {
	const hex = createHash('sha256')
		.update(`gocart-demo:${kind}:${index}`)
		.digest('hex')
		.slice(0, 32);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function transferEvent(id: string, type: 'transfer.created' | 'transfer.reversed', transfer: Stripe.Transfer) {
	return {
		id,
		object: 'event',
		api_version: '2026-07-29.dahlia',
		created: Math.floor(Date.now() / 1000),
		data: { object: transfer },
		livemode: false,
		pending_webhooks: 0,
		request: null,
		type,
	} as unknown as Stripe.Event;
}

async function createSandboxChargeForOrderGroup(stripe: Stripe, orderGroupId: string) {
	const group = await db.orderGroup.findUniqueOrThrow({
		where: { id: orderGroupId },
		select: { order: { select: { id: true, total: true, paymentDetails: { select: { id: true } } } } },
	});
	assert(group.order.paymentDetails, 'Delivered payout fixture is missing payment details.');
	const intent = await stripe.paymentIntents.create(
		{
			amount: Math.round(group.order.total * 100),
			currency: 'usd',
			automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
			payment_method: 'pm_card_visa',
			confirm: true,
			metadata: { orderId: group.order.id, e2ePurpose: 'seller-payout-transfer' },
			description: 'GoCart isolated E2E seller payout source payment',
		},
		{ idempotencyKey: `gocart-e2e-payout-source:${orderGroupId}:${randomUUID()}` },
	);
	assert(intent.status === 'succeeded', `Stripe test source payment did not succeed: ${intent.status}.`);
	const expanded = await stripe.paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] });
	const latestCharge = expanded.latest_charge;
	const chargeId = typeof latestCharge === 'string' ? latestCharge : latestCharge?.id;
	assert(chargeId, 'Stripe test source payment did not expose a charge.');
	await db.paymentDetails.update({
		where: { id: group.order.paymentDetails.id },
		data: { paymentInetntId: intent.id, providerCaptureId: chargeId, paymentMethod: 'Stripe', status: intent.status },
	});
	return chargeId;
}

async function main() {
	if (process.env.E2E_STRIPE_PAYOUT !== 'true') throw new Error('Set E2E_STRIPE_PAYOUT=true to run the external Stripe seller payout test.');
	if (process.env.E2E_PROVIDER_MODE !== 'sandbox') throw new Error('The Stripe seller payout test requires E2E_PROVIDER_MODE=sandbox.');

	const sellerEmail = process.env.E2E_SELLER_EMAIL;
	const adminEmail = process.env.E2E_ADMIN_EMAIL;
	const connectedAccountId = process.env.E2E_STRIPE_CONNECTED_ACCOUNT_ID?.trim();
	assert(sellerEmail && adminEmail, 'E2E seller and admin emails are required.');
	assert(connectedAccountId, 'E2E_STRIPE_CONNECTED_ACCOUNT_ID must identify an active Stripe test connected account.');

	const [seller, admin] = await Promise.all([
		db.user.findUnique({ where: { email: sellerEmail }, select: { id: true, role: true } }),
		db.user.findUnique({ where: { email: adminEmail }, select: { id: true, role: true } }),
	]);
	assert(seller?.role === 'SELLER', 'A seeded E2E seller is required.');
	assert(admin?.role === 'ADMIN', 'A seeded E2E admin is required.');

	const groupIds = [fixtureId('group', 5), fixtureId('group', 11)];
	const groups = await db.orderGroup.findMany({
		where: { id: { in: groupIds } },
		select: { id: true, store: { select: { userId: true } } },
	});
	assert(groups.length === 2 && groups.every((group) => group.store.userId === seller.id), 'The deterministic delivered seller fixtures are missing.');

	const originalSettings = await db.platformSetting.findUnique({ where: { id: 'default' } });
	const originalAccount = await db.sellerPaymentAccount.findUnique({ where: { userId: seller.id } });
	const stripe = getStripeClient();
	const createdTransferIds: string[] = [];
	const eventIds: string[] = [];

	try {
		await updatePlatformSettings({ commissionPercent: originalSettings?.commissionPercent ?? 2, payoutHoldDays: 0 }, admin.id);
		await db.sellerPaymentAccount.upsert({
			where: { userId: seller.id },
			create: { userId: seller.id, providerAccountId: connectedAccountId, status: PaymentAccountStatus.ACTIVE, country: 'US', transfersCapability: 'active', detailsSubmitted: true },
			update: { providerAccountId: connectedAccountId, status: PaymentAccountStatus.ACTIVE, country: 'US', transfersCapability: 'active', detailsSubmitted: true },
		});

		const firstSourceCharge = await createSandboxChargeForOrderGroup(stripe, groupIds[0]);
		const firstSettlement = await createSettlementForOrderGroup(groupIds[0]);
		assert(firstSettlement.status === SettlementStatus.HELD, 'Delivered seller settlement was not held before the batch eligibility refresh.');
		await refreshEligibleSettlements();
		const firstEligibleSettlement = await db.sellerSettlement.findUniqueOrThrow({ where: { id: firstSettlement.id }, select: { status: true } });
		assert(firstEligibleSettlement.status === SettlementStatus.ELIGIBLE, 'Delivered seller settlement did not become eligible in the isolated zero-day window.');
		const firstBatch = await createWeeklyPayoutBatch(new Date());
		assert(firstBatch.status === PayoutBatchStatus.DRAFT, 'The real-transfer batch was not a draft.');
		await approvePayoutBatch(firstBatch.id);
		const paidBatch = await processPayoutBatch(firstBatch.id);
		assert(paidBatch.status === PayoutBatchStatus.PAID, `Real Stripe transfer batch did not complete: ${paidBatch.status}.`);

		const released = await db.sellerSettlement.findUniqueOrThrow({ where: { id: firstSettlement.id }, select: { status: true, providerTransferId: true, remainingPayableCents: true, releasedAt: true } });
		assert(released.status === SettlementStatus.RELEASED && released.providerTransferId && released.releasedAt, 'Seller settlement was not released with a Stripe transfer ID.');
		assert(released.remainingPayableCents === 0, 'Released seller settlement still has an outstanding balance.');
		createdTransferIds.push(released.providerTransferId);
		const transfer = await stripe.transfers.retrieve(released.providerTransferId);
		assert(
			transfer.destination === connectedAccountId
			&& transfer.amount === firstSettlement.sellerPayableCents
			&& transfer.source_transaction === firstSourceCharge,
			'Stripe transfer did not match the seller settlement and source charge.',
		);
		const createdEventId = `gocart-e2e-transfer-created:${randomUUID()}`;
		eventIds.push(createdEventId);
		const webhook = await handleStripeEvent(transferEvent(createdEventId, 'transfer.created', transfer));
		assert(!('ignored' in webhook), 'The real Stripe transfer was not accepted by webhook reconciliation.');
		const balance = await refreshStripeAccountBalance(connectedAccountId);
		assert(balance.lastCheckedAt, 'Seller provider balance refresh did not persist a timestamp.');
		assert(await db.settlementLedgerEntry.count({ where: { settlementId: firstSettlement.id, entryType: SettlementLedgerEntryType.PAYOUT } }) === 1, 'Real transfer did not create exactly one payout ledger entry.');

		await createSandboxChargeForOrderGroup(stripe, groupIds[1]);
		const retryCandidate = await createSettlementForOrderGroup(groupIds[1]);
		assert(retryCandidate.status === SettlementStatus.HELD, 'Retry fixture was not held before the eligibility refresh.');
		await refreshEligibleSettlements();
		const retryEligibleSettlement = await db.sellerSettlement.findUniqueOrThrow({ where: { id: retryCandidate.id }, select: { status: true } });
		assert(retryEligibleSettlement.status === SettlementStatus.ELIGIBLE, 'Retry fixture did not become eligible.');
		const retryBatch = await createWeeklyPayoutBatch(new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000));
		await approvePayoutBatch(retryBatch.id);
		await db.sellerPaymentAccount.update({ where: { userId: seller.id }, data: { providerAccountId: 'acct_00000000000000' } });
		const failedBatch = await processPayoutBatch(retryBatch.id);
		assert(failedBatch.status === PayoutBatchStatus.PARTIAL, 'Stripe provider failure did not make the batch partial.');
		const failed = await db.sellerSettlement.findUniqueOrThrow({ where: { id: retryCandidate.id }, select: { status: true, failureReason: true } });
		assert(failed.status === SettlementStatus.FAILED && failed.failureReason, 'Stripe provider failure did not retain failed seller-transfer state.');
		assert((await retrySettlement(retryCandidate.id)).count === 1, 'Failed seller settlement was not made retryable.');
		await db.sellerPaymentAccount.update({ where: { userId: seller.id }, data: { providerAccountId: connectedAccountId } });
		const retriedBatch = await processPayoutBatch(retryBatch.id);
		assert(retriedBatch.status === PayoutBatchStatus.PAID, `Retried real Stripe transfer batch did not complete: ${retriedBatch.status}.`);
		const retried = await db.sellerSettlement.findUniqueOrThrow({ where: { id: retryCandidate.id }, select: { status: true, providerTransferId: true } });
		assert(retried.status === SettlementStatus.RELEASED && retried.providerTransferId, 'Retried seller transfer was not released.');
		createdTransferIds.push(retried.providerTransferId);

		console.log('Stripe sandbox seller payout passed: real source-charge transfers, reconciliation, seller ledger release, provider failure, and retry.');
	} finally {
		for (const transferId of createdTransferIds.reverse()) {
			try {
				await stripe.transfers.createReversal(transferId, {}, { idempotencyKey: `gocart-e2e-payout-reversal:${transferId}` });
				const reversedTransfer = await stripe.transfers.retrieve(transferId);
				const reversalEventId = `gocart-e2e-transfer-reversed:${randomUUID()}`;
				eventIds.push(reversalEventId);
				const first = await handleStripeEvent(transferEvent(reversalEventId, 'transfer.reversed', reversedTransfer));
				const replay = await handleStripeEvent(transferEvent(reversalEventId, 'transfer.reversed', reversedTransfer));
				assert(!('ignored' in first) && first.duplicate === false, 'Real Stripe transfer reversal was not reconciled.');
				assert(!('ignored' in replay) && replay.duplicate === true, 'Real Stripe transfer reversal replay was not idempotent.');
			} catch (error) {
				console.error('Stripe payout test cleanup reversal failed:', error instanceof Error ? error.message : error);
			}
		}
		await db.sellerPaymentAccountEvent.deleteMany({ where: { providerEventId: { in: eventIds } } });
		if (originalAccount) {
			await db.sellerPaymentAccount.update({ where: { userId: seller.id }, data: {
				providerAccountId: originalAccount.providerAccountId, status: originalAccount.status, country: originalAccount.country,
				transfersCapability: originalAccount.transfersCapability, detailsSubmitted: originalAccount.detailsSubmitted,
				requirementsDueCount: originalAccount.requirementsDueCount, availableBalanceCents: originalAccount.availableBalanceCents,
				pendingBalanceCents: originalAccount.pendingBalanceCents, lastCheckedAt: originalAccount.lastCheckedAt,
			} });
		} else {
			await db.sellerPaymentAccount.deleteMany({ where: { userId: seller.id } });
		}
		if (originalSettings) {
			await db.platformSetting.update({ where: { id: originalSettings.id }, data: { commissionPercent: originalSettings.commissionPercent, payoutHoldDays: originalSettings.payoutHoldDays, updatedById: originalSettings.updatedById } });
		} else {
			await db.platformSetting.deleteMany({ where: { id: 'default' } });
		}
	}
}

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
