export type SellerProfileDateRange = {
	from: string | null;
	to: string | null;
	fromDate: Date | null;
	toDateExclusive: Date | null;
	valid: boolean;
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(value: string | undefined): Date | null {
	if (!value || !DATE_INPUT_PATTERN.test(value)) return null;
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function nextDay(date: Date): Date {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + 1);
	return next;
}

export function parseSellerProfileDateRange(input: { from?: string; to?: string }): SellerProfileDateRange {
	const fromDate = parseDateInput(input.from);
	const toDate = parseDateInput(input.to);
	const hasInvalidInput = Boolean((input.from && !fromDate) || (input.to && !toDate));
	const valid = !hasInvalidInput && (!fromDate || !toDate || fromDate <= toDate);

	return {
		from: fromDate ? input.from! : null,
		to: toDate ? input.to! : null,
		fromDate: valid ? fromDate : null,
		toDateExclusive: valid && toDate ? nextDay(toDate) : null,
		valid,
	};
}

export type LedgerSummaryRow = {
	entryType: string;
	_sum: {
		grossCents: number | null;
		discountCents: number | null;
		commissionCents: number | null;
		refundCents: number | null;
		reversalCents: number | null;
		sellerPayableCents: number | null;
	};
};

export type SellerFinancialSummary = {
	grossCents: number;
	discountCents: number;
	commissionCents: number;
	refundedCents: number;
	reversedCents: number;
	heldCents: number;
	eligibleCents: number;
	approvedCents: number;
	releasedCents: number;
	failedCents: number;
	outstandingCents: number;
};

export function summarizeSellerFinancials(
	ledgerRows: LedgerSummaryRow[],
	statusRows: Array<{ status: string; _sum: { sellerPayableCents: number | null; remainingPayableCents: number | null } }>,
): SellerFinancialSummary {
	const ledger = ledgerRows.reduce((summary, row) => {
		const values = row._sum;
		if (row.entryType === 'INITIAL') {
			summary.grossCents += values.grossCents ?? 0;
			summary.discountCents += values.discountCents ?? 0;
			summary.commissionCents += values.commissionCents ?? 0;
		}
		summary.refundedCents += values.refundCents ?? 0;
		summary.reversedCents += values.reversalCents ?? 0;
		return summary;
	}, {
		grossCents: 0,
		discountCents: 0,
		commissionCents: 0,
		refundedCents: 0,
		reversedCents: 0,
		heldCents: 0,
		eligibleCents: 0,
		approvedCents: 0,
		releasedCents: 0,
		failedCents: 0,
		outstandingCents: 0,
	} satisfies SellerFinancialSummary);

	for (const row of statusRows) {
		const payable = Math.max(0, row._sum.sellerPayableCents ?? 0);
		const remaining = Math.max(0, row._sum.remainingPayableCents ?? 0);
		if (row.status === 'HELD' || row.status === 'BLOCKED') ledger.heldCents += remaining;
		if (row.status === 'ELIGIBLE') ledger.eligibleCents += remaining;
		if (row.status === 'APPROVED' || row.status === 'PROCESSING') ledger.approvedCents += remaining;
		if (row.status === 'RELEASED') ledger.releasedCents += payable;
		if (row.status === 'FAILED') ledger.failedCents += remaining;
		if (['HELD', 'BLOCKED', 'ELIGIBLE', 'APPROVED', 'PROCESSING', 'FAILED'].includes(row.status)) ledger.outstandingCents += remaining;
	}

	return ledger;
}
