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
export const DEFAULT_PAYOUT_HOLD_DAYS = 7;
export const PLATFORM_SETTING_ID = 'default';

export async function getCommissionSettings() {
	const setting = await db.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
	return {
		commissionPercent: setting?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT,
		payoutHoldDays: setting?.payoutHoldDays ?? DEFAULT_PAYOUT_HOLD_DAYS,
	};
}

export async function getConfiguredCommissionPercent() {
	return percentFromConfig((await getCommissionSettings()).commissionPercent);
}

export function payoutHoldDaysFromConfig(value: number | null | undefined) {
	if (value === null || value === undefined || !Number.isInteger(value) || value < 0 || value > 365) {
		throw new Error('Payout hold days must be a whole number from 0 to 365.');
	}
	return value;
}

export async function getConfiguredPayoutHoldDays() {
	return payoutHoldDaysFromConfig((await getCommissionSettings()).payoutHoldDays);
}

export async function updateCommissionPercent(commissionPercent: number, updatedById: string) {
	const validated = percentFromConfig(commissionPercent);
	return db.platformSetting.upsert({
		where: { id: PLATFORM_SETTING_ID },
		update: { commissionPercent: Math.round(validated), updatedById },
		create: { id: PLATFORM_SETTING_ID, commissionPercent: Math.round(validated), payoutHoldDays: DEFAULT_PAYOUT_HOLD_DAYS, updatedById },
	});
}

export async function updatePlatformSettings(input: { commissionPercent: number; payoutHoldDays: number }, updatedById: string) {
	const commissionPercent = Math.round(percentFromConfig(input.commissionPercent));
	const payoutHoldDays = payoutHoldDaysFromConfig(input.payoutHoldDays);
	return db.platformSetting.upsert({
		where: { id: PLATFORM_SETTING_ID },
		update: { commissionPercent, payoutHoldDays, updatedById },
		create: { id: PLATFORM_SETTING_ID, commissionPercent, payoutHoldDays, updatedById },
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

function deliveryEvidenceAt(group: {
	items: Array<{ deliveredAt: Date | null }>;
	shipmentAssignments: Array<{
		shipment: {
			status: string;
			proofOfDeliveryAt: Date | null;
			estimatedDeliveryAt: Date | null;
			updatedAt: Date;
		};
	}>;
}): Date | null {
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

export function settlementReleaseAt(deliveryAt: Date | null, payoutHoldDays = DEFAULT_PAYOUT_HOLD_DAYS): Date | null {
	return deliveryAt ? new Date(deliveryAt.getTime() + payoutHoldDays * 24 * 60 * 60 * 1000) : null;
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
	const settings = await getCommissionSettings();
	const commissionPercent = percentFromConfig(settings.commissionPercent);
	const snapshot = calculateSettlementSnapshot({
		grossCents,
		discountCents,
		shippingCents: toCents(group.shippingFees),
		taxCents: 0,
		providerFeeCents: 0,
		commissionPercent,
	});
	assertUsdSettlement(CANONICAL_SETTLEMENT_CURRENCY);
	const releaseAt = settlementReleaseAt(deliveryEvidenceAt(group), payoutHoldDaysFromConfig(settings.payoutHoldDays));
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
	const blocked = await db.sellerSettlement.findMany({
		where: {
			status: SettlementStatus.BLOCKED,
			payoutBatchId: null,
			providerTransferId: null,
		},
		select: { orderGroupId: true },
	});
	const repaired = await Promise.all(blocked.map(({ orderGroupId }) => refreshSettlementEligibilityForOrderGroup(orderGroupId, now)));
	return result.count + repaired.filter((settlement) => settlement?.status === SettlementStatus.ELIGIBLE).length;
}

/**
 * Re-check a settlement after fulfillment or carrier evidence changes.
 * A settlement created before delivery has no eligibleAt and starts BLOCKED;
 * it must be recalculated when delivery evidence is later recorded.
 */
export async function refreshSettlementEligibilityForOrderGroup(
	orderGroupId: string,
	now = new Date(),
) {
	const settlement = await db.sellerSettlement.findUnique({
		where: { orderGroupId },
		select: {
			id: true,
			status: true,
			payoutBatchId: true,
			providerTransferId: true,
			eligibleAt: true,
		},
	});
	if (!settlement || settlement.payoutBatchId || settlement.providerTransferId) {
		return settlement;
	}

	const group = await db.orderGroup.findUnique({
		where: { id: orderGroupId },
		include: {
			order: { select: { paymentStatus: true } },
			items: { select: { deliveredAt: true } },
			shipmentAssignments: {
				include: {
					shipment: {
						select: {
							status: true,
							proofOfDeliveryAt: true,
							estimatedDeliveryAt: true,
							updatedAt: true,
						},
					},
				},
			},
		},
	});
	if (!group) return settlement;

	const settings = await getCommissionSettings();
	const releaseAt = settlementReleaseAt(
		deliveryEvidenceAt(group),
		payoutHoldDaysFromConfig(settings.payoutHoldDays),
	);
	const paid = group.order.paymentStatus === 'Paid' || group.order.paymentStatus === 'PartiallyRefunded';
	const nextStatus = paid && releaseAt
		? releaseAt <= now ? SettlementStatus.ELIGIBLE : SettlementStatus.HELD
		: SettlementStatus.BLOCKED;

	if (
		settlement.status === nextStatus &&
		(settlement.eligibleAt?.getTime() ?? null) === (releaseAt?.getTime() ?? null)
	) {
		return settlement;
	}

	return db.sellerSettlement.update({
		where: { id: settlement.id },
		data: {
			status: nextStatus,
			eligibleAt: releaseAt,
			failureReason: null,
		},
	});
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
		where: { status: SettlementStatus.ELIGIBLE, payoutBatchId: null, currency: CANONICAL_SETTLEMENT_CURRENCY },
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
			return tx.payoutBatch.update({ where: { id: batch.id }, data: { totalCents } });
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

export type TransferCreator = (input: {
	amountCents: number;
	destination: string;
	idempotencyKey: string;
	settlementId: string;
	transferAttempt: number;
}) => Promise<{ id: string }>;

export const createStripeTransfer: TransferCreator = async ({ amountCents, destination, idempotencyKey, settlementId, transferAttempt }) => {
	const stripe = getStripeClient();
	// If a network response was lost after Stripe accepted a prior attempt, reuse
	// the provider object instead of risking a second seller transfer.
	const previousTransfers = await stripe.transfers.list({ limit: 100 });
	const previousTransfer = previousTransfers.data.find((transfer) => transfer.metadata.settlementId === settlementId);
	if (previousTransfer) return { id: previousTransfer.id };

	const settlement = await db.sellerSettlement.findUniqueOrThrow({
		where: { id: settlementId },
		select: {
			orderGroup: {
				select: {
					order: { select: { paymentDetails: { select: { paymentInetntId: true, paymentMethod: true } } } },
				},
			},
		},
	});
	const payment = settlement.orderGroup.order.paymentDetails;
	let sourceTransaction: string | undefined;
	if (payment?.paymentMethod === 'Stripe' && payment.paymentInetntId.startsWith('pi_')) {
		const intent = await stripe.paymentIntents.retrieve(payment.paymentInetntId, { expand: ['latest_charge'] });
		const latestCharge = intent.latest_charge;
		sourceTransaction = typeof latestCharge === 'string' ? latestCharge : latestCharge?.id;
		if (!sourceTransaction) throw new Error('Stripe payment is missing a settled source charge for this seller transfer.');
	}

	const transfer = await stripe.transfers.create({
		amount: amountCents,
		currency: 'usd',
		destination,
		...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
		description: `GoCart seller settlement ${settlementId}`,
		metadata: { settlementId, transferAttempt: String(transferAttempt) },
	}, { idempotencyKey });
	return { id: transfer.id };
};

export async function processPayoutBatch(batchId: string, transferCreator: TransferCreator = createStripeTransfer) {
	const batch = await db.payoutBatch.findUnique({ where: { id: batchId }, include: { settlements: true } });
	if (!batch) throw new Error('Payout batch not found.');
	if (batch.status !== PayoutBatchStatus.APPROVED && batch.status !== PayoutBatchStatus.PARTIAL) throw new Error('Only an approved payout batch can be processed.');
	if (!batch.settlements.some((settlement) => settlement.status === SettlementStatus.APPROVED)) {
		throw new Error('This batch has no approved seller settlements to transfer. Create a new batch after delivery evidence makes funds eligible.');
	}
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
		const processingSettlement = await db.sellerSettlement.update({
			where: { id: settlement.id },
			data: { status: SettlementStatus.PROCESSING, transferAttempt: { increment: 1 } },
			select: { transferAttempt: true },
		});
		try {
			const transfer = await transferCreator({
				amountCents,
				destination: account.providerAccountId,
				idempotencyKey: `settlement:transfer:${settlement.id}:${processingSettlement.transferAttempt}`,
				settlementId: settlement.id,
				transferAttempt: processingSettlement.transferAttempt,
			});
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

const CHARGEBACK_ENTRY_PREFIX = 'settlement:chargeback:';

function settlementStatusFromMetadata(metadata: Prisma.JsonValue | null): SettlementStatus {
	if (metadata && typeof metadata === 'object' && !Array.isArray(metadata) && 'previousStatus' in metadata) {
		const previousStatus = metadata.previousStatus;
		if (typeof previousStatus === 'string' && Object.values(SettlementStatus).includes(previousStatus as SettlementStatus)) {
			return previousStatus as SettlementStatus;
		}
	}
	return SettlementStatus.BLOCKED;
}

export async function recordChargebackForOrder(input: {
	orderId: string;
	disputeId: string;
	providerEventId: string;
	amountCents: number;
	status: string;
	reason?: string | null;
}) {
	assertUsdSettlement(CANONICAL_SETTLEMENT_CURRENCY);
	const disputeEntryPrefix = CHARGEBACK_ENTRY_PREFIX + input.disputeId + ':';
	const existingEntries = await db.settlementLedgerEntry.findMany({
		where: { idempotencyKey: { startsWith: disputeEntryPrefix } },
		select: { id: true, settlementId: true, sellerPayableCents: true, reversalCents: true, metadata: true },
	});

	if (input.status === 'won') {
		if (existingEntries.length === 0) return { appliedCents: 0, restored: false };
		return db.$transaction(async (tx) => {
			let restoredCents = 0;
			for (const entry of existingEntries) {
				const idempotencyKey = CHARGEBACK_ENTRY_PREFIX + 'recovery:' + input.disputeId + ':' + entry.settlementId;
				const recoveryExists = await tx.settlementLedgerEntry.findUnique({ where: { idempotencyKey }, select: { id: true } });
				if (recoveryExists) continue;
				const sellerRecoveryCents = Math.max(0, -entry.sellerPayableCents);
				if (sellerRecoveryCents === 0) continue;
				await tx.settlementLedgerEntry.create({
					data: {
						settlementId: entry.settlementId,
						entryType: SettlementLedgerEntryType.ADJUSTMENT,
						idempotencyKey,
						currency: CANONICAL_SETTLEMENT_CURRENCY,
						reversalCents: -entry.reversalCents,
						sellerPayableCents: sellerRecoveryCents,
						metadata: { kind: 'CHARGEBACK_RECOVERY', providerDisputeId: input.disputeId, providerEventId: input.providerEventId },
					},
				});
				await tx.sellerSettlement.update({
					where: { id: entry.settlementId },
					data: {
						reversedCents: { decrement: entry.reversalCents },
						remainingPayableCents: { increment: sellerRecoveryCents },
						status: settlementStatusFromMetadata(entry.metadata),
					},
				});
				restoredCents += sellerRecoveryCents;
			}
			return { appliedCents: restoredCents, restored: restoredCents > 0 };
		});
	}

	if (existingEntries.length > 0 || input.amountCents <= 0) return { appliedCents: 0, restored: false };
	const settlements = await db.sellerSettlement.findMany({
		where: { orderGroup: { orderId: input.orderId } },
		select: { id: true, status: true, grossCents: true, sellerPayableCents: true },
		orderBy: { id: 'asc' },
	});
	const allocations = allocateProportionally(
		Math.max(0, Math.trunc(input.amountCents)),
		settlements.map((settlement) => ({ key: settlement.id, weightCents: Math.max(0, settlement.sellerPayableCents || settlement.grossCents) })),
	);
	return db.$transaction(async (tx) => {
		let appliedCents = 0;
		for (const allocation of allocations) {
			if (allocation.cents <= 0) continue;
			const settlement = settlements.find((item) => item.id === allocation.key);
			if (!settlement) continue;
			await tx.settlementLedgerEntry.create({
				data: {
					settlementId: settlement.id,
					entryType: SettlementLedgerEntryType.ADJUSTMENT,
					idempotencyKey: disputeEntryPrefix + settlement.id,
					currency: CANONICAL_SETTLEMENT_CURRENCY,
					reversalCents: allocation.cents,
					sellerPayableCents: -allocation.cents,
					metadata: { kind: 'CHARGEBACK', providerDisputeId: input.disputeId, providerEventId: input.providerEventId, reason: input.reason ?? null, previousStatus: settlement.status },
				},
			});
			await tx.sellerSettlement.update({
				where: { id: settlement.id },
				data: {
					reversedCents: { increment: allocation.cents },
					remainingPayableCents: { decrement: allocation.cents },
					status: settlement.status === SettlementStatus.RELEASED || settlement.status === SettlementStatus.PROCESSING ? SettlementStatus.REVERSED : SettlementStatus.BLOCKED,
				},
			});
			appliedCents += allocation.cents;
		}
		return { appliedCents, restored: false };
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

export const SETTLEMENT_PAGE_SIZE = 25;
export const PAYOUT_BATCH_PAGE_SIZE = 10;

export type SettlementPagination = {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

function buildPagination(total: number, requestedPage: number | undefined, pageSize: number): SettlementPagination {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const parsedPage = Number.isFinite(requestedPage) ? Math.floor(requestedPage as number) : 1;
	const page = Math.min(Math.max(parsedPage, 1), totalPages);
	return { page, pageSize, total, totalPages };
}

export async function listSellerSettlements({ sellerId, storeUrl, page }: { sellerId: string; storeUrl?: string; page?: number }) {
	const where = {
		sellerId,
		...(storeUrl ? { orderGroup: { store: { url: storeUrl } } } : {}),
	};
	const total = await db.sellerSettlement.count({ where });
	const pagination = buildPagination(total, page, SETTLEMENT_PAGE_SIZE);
	const [items, statusTotals] = await Promise.all([
		db.sellerSettlement.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			skip: (pagination.page - 1) * pagination.pageSize,
			take: pagination.pageSize,
			include: { orderGroup: { select: { id: true, store: { select: { name: true, url: true } } } }, entries: { orderBy: { createdAt: 'desc' }, take: 10 } },
		}),
		db.sellerSettlement.groupBy({ by: ['status'], where, _sum: { sellerPayableCents: true, remainingPayableCents: true } }),
	]);
	const summary = statusTotals.reduce((totals, row) => {
		if (row.status === 'RELEASED') totals.releasedCents += row._sum.sellerPayableCents ?? 0;
		if (row.status === 'HELD' || row.status === 'BLOCKED') totals.heldCents += row._sum.remainingPayableCents ?? 0;
		return totals;
	}, { heldCents: 0, releasedCents: 0 });
	return { items, pagination, summary };
}

export async function listSettlementOperations({ page }: { page?: number } = {}) {
	const total = await db.sellerSettlement.count();
	const pagination = buildPagination(total, page, SETTLEMENT_PAGE_SIZE);
	const items = await db.sellerSettlement.findMany({
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		skip: (pagination.page - 1) * pagination.pageSize,
		take: pagination.pageSize,
		include: { seller: { select: { id: true, name: true, email: true } }, orderGroup: { select: { id: true, store: { select: { name: true, url: true } } } }, payoutBatch: { select: { id: true, status: true, weekStart: true } } },
	});
	return { items, pagination };
}

export async function listPayoutBatches({ page }: { page?: number } = {}) {
	const total = await db.payoutBatch.count();
	const pagination = buildPagination(total, page, PAYOUT_BATCH_PAGE_SIZE);
	const items = await db.payoutBatch.findMany({
		orderBy: [{ weekStart: 'desc' }, { id: 'desc' }],
		skip: (pagination.page - 1) * pagination.pageSize,
		take: pagination.pageSize,
		select: { id: true, weekStart: true, weekEnd: true, status: true, totalCents: true, _count: { select: { settlements: true } } },
	});
	return { items, pagination };
}
