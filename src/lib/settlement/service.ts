import { db } from '@/lib/db';
import { getStripeClient } from '@/lib/payments/stripe-client';
import {
	PayoutBatchStatus,
	Prisma,
	SettlementLedgerEntryType,
	SettlementStatus,
} from '@prisma/client';
import {
	allocateProportionally,
	CANONICAL_SETTLEMENT_CURRENCY,
	calculateSettlementSnapshot,
	DEFAULT_COMMISSION_PERCENT,
	percentFromConfig,
	toCents,
} from './calculation';

export const DEFAULT_PAYOUT_TIMEZONE = 'Asia/Dhaka';
export const DEFAULT_PAYOUT_COUNTRIES = ['US', 'BD', 'CA', 'GB', 'AU', 'SG'];
export const PLATFORM_SETTING_ID = 'default';

export async function getCommissionSettings() {
	const setting = await db.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
	return { commissionPercent: setting?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT };
}

export async function getConfiguredCommissionPercent() {
	return percentFromConfig((await getCommissionSettings()).commissionPercent);
}

export async function updateCommissionPercent(commissionPercent: number, updatedById: string) {
	const validated = percentFromConfig(commissionPercent);
	return db.platformSetting.upsert({
		where: { id: PLATFORM_SETTING_ID },
		update: { commissionPercent: Math.round(validated), updatedById },
		create: { id: PLATFORM_SETTING_ID, commissionPercent: Math.round(validated), updatedById },
	});
}

export function payoutCountryAllowlist(): string[] {
	const configured = process.env.GOCART_PAYOUT_COUNTRIES?.split(',')
		.map((country) => country.trim().toUpperCase())
		.filter(Boolean);
	return configured?.length ? [...new Set(configured)] : DEFAULT_PAYOUT_COUNTRIES;
}

export function isPayoutCountryAllowed(country: string | null | undefined): boolean {
	return Boolean(country && payoutCountryAllowlist().includes(country.toUpperCase()));
}

export function assertUsdSettlement(currency: string) {
	if (currency.toUpperCase() !== CANONICAL_SETTLEMENT_CURRENCY) {
		throw new Error('GoCart settlement ledger only supports USD.');
	}
}

type SettlementGroup = Prisma.OrderGroupGetPayload<{
	include: {
		order: { select: { paymentStatus: true; coinDiscount: true } };
		store: { select: { userId: true } };
		items: { select: { totalPrice: true; deliveredAt: true; status: true } };
		shipmentAssignments: {
			include: {
				shipment: { select: { status: true; proofOfDeliveryAt: true; estimatedDeliveryAt: true; updatedAt: true } };
			};
		};
	};
}>;

function maxDate(values: Array<Date | null | undefined>): Date | null {
	const dates = values.filter((value): value is Date => value instanceof Date);
	return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

function deliveryEvidenceAt(group: SettlementGroup): Date | null {
	const itemEvidence = maxDate(group.items.map((item) => item.deliveredAt));
	const shipmentEvidence = maxDate(group.shipmentAssignments.flatMap(({ shipment }) => [
		shipment.status === 'DELIVERED' ? shipment.proofOfDeliveryAt ?? shipment.updatedAt : null,
	]));
	if (itemEvidence || shipmentEvidence) return maxDate([itemEvidence, shipmentEvidence]);
	return maxDate(group.shipmentAssignments.flatMap(({ shipment }) => [
		shipment.estimatedDeliveryAt ? new Date(shipment.estimatedDeliveryAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
	]));
}

function groupGrossCents(group: { items: Array<{ totalPrice: number }> }): number {
	return group.items.reduce((sum, item) => sum + toCents(item.totalPrice), 0);
}

export function settlementReleaseAt(deliveryAt: Date | null): Date | null {
	return deliveryAt ? new Date(deliveryAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
}

export async function createSettlementForOrderGroup(orderGroupId: string) {
	const existing = await db.sellerSettlement.findUnique({ where: { orderGroupId } });
	if (existing) return existing;

	const group = await db.orderGroup.findUnique({
		where: { id: orderGroupId },
		include: {
			order: { select: { paymentStatus: true, coinDiscount: true } },
			store: { select: { userId: true } },
			items: { select: { totalPrice: true, deliveredAt: true, status: true } },
			shipmentAssignments: {
				include: {
					shipment: { select: { status: true, proofOfDeliveryAt: true, estimatedDeliveryAt: true, updatedAt: true } },
				},
			},
		},
	});
	if (!group) throw new Error('Order group not found.');

	const allGroups = await db.orderGroup.findMany({
		where: { orderId: group.orderId },
		select: { id: true, total: true, items: { select: { totalPrice: true } } },
	});
	const grossCents = groupGrossCents(group);
	const couponDiscountCents = Math.max(0, grossCents - toCents(group.total));
	const allocations = allocateProportionally(
		toCents(group.order.coinDiscount),
		allGroups.map((candidate) => ({ key: candidate.id, weightCents: groupGrossCents(candidate) })),
	);
	const discountCents = couponDiscountCents + (allocations.find((item) => item.key === group.id)?.cents ?? 0);
	const commissionPercent = await getConfiguredCommissionPercent();
	const snapshot = calculateSettlementSnapshot({
		grossCents,
		discountCents,
		shippingCents: toCents(group.shippingFees),
		taxCents: 0,
		providerFeeCents: 0,
		commissionPercent,
	});
	assertUsdSettlement(CANONICAL_SETTLEMENT_CURRENCY);
	const releaseAt = settlementReleaseAt(deliveryEvidenceAt(group));
	const status = group.order.paymentStatus === 'Paid' || group.order.paymentStatus === 'PartiallyRefunded'
		? releaseAt ? SettlementStatus.HELD : SettlementStatus.BLOCKED
		: SettlementStatus.BLOCKED;

	try {
		return await db.$transaction(async (tx) => {
			const settlement = await tx.sellerSettlement.create({
				data: {
					orderGroupId: group.id,
					sellerId: group.store.userId,
					currency: CANONICAL_SETTLEMENT_CURRENCY,
					status,
					...snapshot,
					commissionPercent,
					remainingPayableCents: snapshot.sellerPayableCents,
					eligibleAt: releaseAt,
				},
			});
			await tx.settlementLedgerEntry.create({
				data: {
					settlementId: settlement.id,
					entryType: SettlementLedgerEntryType.INITIAL,
					idempotencyKey: `settlement:initial:${group.id}`,
					currency: CANONICAL_SETTLEMENT_CURRENCY,
					...snapshot,
				},
			});
			return settlement;
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			return db.sellerSettlement.findUniqueOrThrow({ where: { orderGroupId } });
		}
		throw error;
	}
}

export async function createSettlementsForPaidOrder(orderId: string) {
	const groups = await db.orderGroup.findMany({ where: { orderId }, select: { id: true } });
	return Promise.all(groups.map((group) => createSettlementForOrderGroup(group.id)));
}

export async function refreshEligibleSettlements(now = new Date()) {
	const result = await db.sellerSettlement.updateMany({
		where: { status: SettlementStatus.HELD, eligibleAt: { lte: now } },
		data: { status: SettlementStatus.ELIGIBLE },
	});
	return result.count;
}

export async function createWeeklyPayoutBatch(now = new Date()) {
	await refreshEligibleSettlements(now);
	const weekEnd = new Date(now);
	weekEnd.setUTCHours(23, 59, 59, 999);
	const weekStart = new Date(weekEnd);
	weekStart.setUTCDate(weekStart.getUTCDate() - 6);
	weekStart.setUTCHours(0, 0, 0, 0);
	const idempotencyKey = `payout-batch:${DEFAULT_PAYOUT_TIMEZONE}:${weekStart.toISOString().slice(0, 10)}`;
	const eligible = await db.sellerSettlement.findMany({
		where: { status: SettlementStatus.ELIGIBLE, currency: CANONICAL_SETTLEMENT_CURRENCY },
		select: { id: true, sellerPayableCents: true, remainingPayableCents: true },
	});
	const totalCents = eligible.reduce((sum, settlement) => sum + Math.max(0, settlement.remainingPayableCents ?? settlement.sellerPayableCents), 0);
	return db.$transaction(async (tx) => {
		const batch = await tx.payoutBatch.upsert({
			where: { idempotencyKey },
			update: {},
			create: {
				weekStart,
				weekEnd,
				timezone: DEFAULT_PAYOUT_TIMEZONE,
				currency: CANONICAL_SETTLEMENT_CURRENCY,
				status: PayoutBatchStatus.DRAFT,
				totalCents,
				idempotencyKey,
			},
		});
		if (batch.status === PayoutBatchStatus.DRAFT) {
			await tx.sellerSettlement.updateMany({
				where: { id: { in: eligible.map((item) => item.id) }, status: SettlementStatus.ELIGIBLE },
				data: { payoutBatchId: batch.id },
			});
		}
		return batch;
	});
}

export async function approvePayoutBatch(batchId: string) {
	return db.$transaction(async (tx) => {
		const batch = await tx.payoutBatch.findUnique({ where: { id: batchId } });
		if (!batch) throw new Error('Payout batch not found.');
		if (batch.status !== PayoutBatchStatus.DRAFT) return batch;
		await tx.sellerSettlement.updateMany({ where: { payoutBatchId: batch.id, status: SettlementStatus.ELIGIBLE }, data: { status: SettlementStatus.APPROVED, approvedAt: new Date() } });
		return tx.payoutBatch.update({ where: { id: batch.id }, data: { status: PayoutBatchStatus.APPROVED, approvedAt: new Date() } });
	});
}

export type TransferCreator = (input: { amountCents: number; destination: string; idempotencyKey: string; settlementId: string }) => Promise<{ id: string }>;

export const createStripeTransfer: TransferCreator = async ({ amountCents, destination, idempotencyKey, settlementId }) => {
	const transfer = await getStripeClient().transfers.create({
		amount: amountCents,
		currency: 'usd',
		destination,
		description: `GoCart seller settlement ${settlementId}`,
		metadata: { settlementId },
	}, { idempotencyKey });
	return { id: transfer.id };
};

export async function processPayoutBatch(batchId: string, transferCreator: TransferCreator = createStripeTransfer) {
	const batch = await db.payoutBatch.findUnique({ where: { id: batchId }, include: { settlements: true } });
	if (!batch) throw new Error('Payout batch not found.');
	if (batch.status !== PayoutBatchStatus.APPROVED && batch.status !== PayoutBatchStatus.PARTIAL) throw new Error('Only an approved payout batch can be processed.');
	await db.payoutBatch.update({ where: { id: batch.id }, data: { status: PayoutBatchStatus.PROCESSING } });

	let failed = 0;
	for (const settlement of batch.settlements.filter((item) => item.status === SettlementStatus.APPROVED)) {
		const account = await db.sellerPaymentAccount.findUnique({ where: { userId: settlement.sellerId } });
		if (!account || account.status !== 'ACTIVE' || account.transfersCapability !== 'active' || !isPayoutCountryAllowed(account.country)) {
			failed += 1;
			await db.sellerSettlement.update({ where: { id: settlement.id }, data: { status: SettlementStatus.BLOCKED, failureReason: 'Seller payout account is not transfer-ready or its country is not allowed.' } });
			continue;
		}
		const amountCents = Math.max(0, settlement.remainingPayableCents);
		if (amountCents === 0) {
			await db.sellerSettlement.update({ where: { id: settlement.id }, data: { status: SettlementStatus.RELEASED, releasedAt: new Date() } });
			continue;
		}
		await db.sellerSettlement.updateMany({ where: { id: settlement.id, status: SettlementStatus.APPROVED }, data: { status: SettlementStatus.PROCESSING } });
		try {
			const transfer = await transferCreator({ amountCents, destination: account.providerAccountId, idempotencyKey: `settlement:transfer:${settlement.id}`, settlementId: settlement.id });
			await db.$transaction(async (tx) => {
				await tx.sellerSettlement.update({ where: { id: settlement.id }, data: { status: SettlementStatus.RELEASED, providerTransferId: transfer.id, releasedAt: new Date(), remainingPayableCents: 0, failureReason: null } });
				await tx.settlementLedgerEntry.create({ data: { settlementId: settlement.id, entryType: SettlementLedgerEntryType.PAYOUT, idempotencyKey: `settlement:payout:${settlement.id}`, currency: 'USD', sellerPayableCents: -amountCents, metadata: { providerTransferId: transfer.id } } });
			});
		} catch (error) {
			failed += 1;
			await db.sellerSettlement.update({ where: { id: settlement.id }, data: { status: SettlementStatus.FAILED, failureReason: error instanceof Error ? error.message : 'Transfer failed.' } });
		}
	}
	return db.payoutBatch.update({ where: { id: batch.id }, data: { status: failed ? PayoutBatchStatus.PARTIAL : PayoutBatchStatus.PAID, processedAt: new Date(), failureReason: failed ? `${failed} seller transfer(s) require correction and retry.` : null } });
}

export async function retrySettlement(settlementId: string) {
	return db.sellerSettlement.updateMany({
		where: { id: settlementId, status: { in: [SettlementStatus.FAILED, SettlementStatus.BLOCKED] }, payoutBatchId: { not: null } },
		data: { status: SettlementStatus.APPROVED, failureReason: null },
	});
}

export async function recordSettlementRefund(input: {
	settlementId: string;
	idempotencyKey: string;
	refundCents: number;
	sellerRefundCents: number;
	commissionReversalCents: number;
}) {
	if (input.refundCents <= 0 || input.sellerRefundCents <= 0) throw new Error('Refund adjustment must be positive.');
	return db.$transaction(async (tx) => {
		const existing = await tx.settlementLedgerEntry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
		if (existing) return existing;
		const settlement = await tx.sellerSettlement.findUniqueOrThrow({ where: { id: input.settlementId } });
		const entry = await tx.settlementLedgerEntry.create({ data: {
			settlementId: settlement.id,
			entryType: SettlementLedgerEntryType.REFUND,
			idempotencyKey: input.idempotencyKey,
			currency: 'USD',
			commissionCents: -Math.max(0, input.commissionReversalCents),
			refundCents: input.refundCents,
			sellerPayableCents: -input.sellerRefundCents,
		} });
		await tx.sellerSettlement.update({ where: { id: settlement.id }, data: { refundedCents: { increment: input.refundCents }, remainingPayableCents: { decrement: input.sellerRefundCents }, status: settlement.status === SettlementStatus.RELEASED ? SettlementStatus.REVERSED : settlement.status } });
		return entry;
	});
}

export async function recordRefundForReturnRequest(returnRequestId: string, amountCents: number) {
	const request = await db.returnRequest.findUnique({ where: { id: returnRequestId }, select: { orderGroupId: true } });
	if (!request || amountCents <= 0) return null;
	const settlement = await db.sellerSettlement.findUnique({ where: { orderGroupId: request.orderGroupId }, select: { id: true, commissionPercent: true } });
	if (!settlement) return null;
	return recordSettlementRefund({
		settlementId: settlement.id,
		idempotencyKey: `settlement:refund:${returnRequestId}`,
		refundCents: amountCents,
		sellerRefundCents: amountCents,
		commissionReversalCents: Math.round((amountCents * settlement.commissionPercent) / 100),
	});
}

export async function listSellerSettlements(sellerId: string) {
	return db.sellerSettlement.findMany({ where: { sellerId }, orderBy: { createdAt: 'desc' }, include: { orderGroup: { select: { id: true, store: { select: { name: true, url: true } } } }, entries: { orderBy: { createdAt: 'desc' }, take: 10 } } });
}

export async function listSettlementOperations() {
	return db.sellerSettlement.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { seller: { select: { id: true, name: true, email: true } }, orderGroup: { select: { id: true, store: { select: { name: true, url: true } } } }, payoutBatch: { select: { id: true, status: true, weekStart: true } } } });
}

export async function listPayoutBatches() {
	return db.payoutBatch.findMany({ orderBy: { weekStart: 'desc' }, take: 20, select: { id: true, weekStart: true, weekEnd: true, status: true, totalCents: true } });
}
