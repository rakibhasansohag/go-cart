'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
	createStripeTransfer,
	isPayoutCountryAllowed,
	TransferCreator,
} from '@/lib/settlement/service';
import {
	SettlementLedgerEntryType,
	SettlementStatus,
} from '@prisma/client';

export type DisbursementResult = {
	success: boolean;
	settlementId: string;
	transferId?: string;
	amountCents: number;
	error?: string;
};

async function requireAdmin() {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');
	const actor = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	if (actor?.role !== 'ADMIN') {
		throw new Error('Unauthorized Access: Admin privileges required.');
	}
}

export async function processSellerDisbursement(
	input: { settlementId: string },
	transferCreator: TransferCreator = createStripeTransfer,
): Promise<DisbursementResult> {
	await requireAdmin();

	const settlement = await db.sellerSettlement.findUnique({
		where: { id: input.settlementId },
		include: {
			orderGroup: {
				select: {
					id: true,
					store: { select: { id: true, name: true, url: true } },
				},
			},
		},
	});

	if (!settlement) {
		throw new Error('Settlement not found.');
	}

	if (
		settlement.status !== SettlementStatus.APPROVED &&
		settlement.status !== SettlementStatus.ELIGIBLE
	) {
		throw new Error(
			`Settlement cannot be disbursed in status ${settlement.status}. Only APPROVED or ELIGIBLE settlements are payable.`,
		);
	}

	const account = await db.sellerPaymentAccount.findUnique({
		where: { userId: settlement.sellerId },
	});

	if (
		!account ||
		account.status !== 'ACTIVE' ||
		account.transfersCapability !== 'active' ||
		!isPayoutCountryAllowed(account.country)
	) {
		const failureReason =
			'Seller payout account is not transfer-ready or its country is not allowed.';
		await db.sellerSettlement.update({
			where: { id: settlement.id },
			data: { status: SettlementStatus.BLOCKED, failureReason },
		});
		return {
			success: false,
			settlementId: settlement.id,
			amountCents: settlement.remainingPayableCents,
			error: failureReason,
		};
	}

	const amountCents = Math.max(0, settlement.remainingPayableCents);
	if (amountCents === 0) {
		await db.sellerSettlement.update({
			where: { id: settlement.id },
			data: { status: SettlementStatus.RELEASED, releasedAt: new Date() },
		});
		return {
			success: true,
			settlementId: settlement.id,
			amountCents: 0,
		};
	}

	const processingSettlement = await db.sellerSettlement.update({
		where: { id: settlement.id },
		data: {
			status: SettlementStatus.PROCESSING,
			transferAttempt: { increment: 1 },
		},
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
			await tx.sellerSettlement.update({
				where: { id: settlement.id },
				data: {
					status: SettlementStatus.RELEASED,
					providerTransferId: transfer.id,
					releasedAt: new Date(),
					remainingPayableCents: 0,
					failureReason: null,
				},
			});
			await tx.settlementLedgerEntry.create({
				data: {
					settlementId: settlement.id,
					entryType: SettlementLedgerEntryType.PAYOUT,
					idempotencyKey: `settlement:payout:${settlement.id}:${processingSettlement.transferAttempt}`,
					currency: 'USD',
					sellerPayableCents: -amountCents,
					metadata: { providerTransferId: transfer.id },
				},
			});
		});

		return {
			success: true,
			settlementId: settlement.id,
			transferId: transfer.id,
			amountCents,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Disbursement transfer failed.';
		await db.sellerSettlement.update({
			where: { id: settlement.id },
			data: {
				status: SettlementStatus.FAILED,
				failureReason: errorMessage,
			},
		});
		return {
			success: false,
			settlementId: settlement.id,
			amountCents,
			error: errorMessage,
		};
	}
}
