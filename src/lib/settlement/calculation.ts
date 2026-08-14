export const CANONICAL_SETTLEMENT_CURRENCY = 'USD';
export const DEFAULT_COMMISSION_PERCENT = 2;
export const MAX_COMMISSION_PERCENT = 100;

export type SettlementSnapshot = {
	 grossCents: number;
	 discountCents: number;
	 shippingCents: number;
	 taxCents: number;
	 providerFeeCents: number;
	 commissionCents: number;
	 sellerPayableCents: number;
};

export function toCents(amount: number): number {
	if (!Number.isFinite(amount)) throw new Error('Money amount must be finite.');
	return Math.round(amount * 100);
}

export function percentFromConfig(value = process.env.GOCART_COMMISSION_PERCENT): number {
	const percent = value == null || value.trim() === '' ? DEFAULT_COMMISSION_PERCENT : Number(value);
	if (!Number.isFinite(percent) || percent < 0 || percent > MAX_COMMISSION_PERCENT) {
		throw new Error(`Commission percent must be between 0 and ${MAX_COMMISSION_PERCENT}.`);
	}
	return percent;
}

export function calculateSettlementSnapshot(input: {
	grossCents: number;
	discountCents?: number;
	shippingCents?: number;
	taxCents?: number;
	providerFeeCents?: number;
	refundCents?: number;
	commissionPercent?: number;
}): SettlementSnapshot {
	const grossCents = Math.max(0, Math.trunc(input.grossCents));
	const discountCents = Math.max(0, Math.trunc(input.discountCents ?? 0));
	const shippingCents = Math.max(0, Math.trunc(input.shippingCents ?? 0));
	const taxCents = Math.max(0, Math.trunc(input.taxCents ?? 0));
	const providerFeeCents = Math.max(0, Math.trunc(input.providerFeeCents ?? 0));
	const refundCents = Math.max(0, Math.trunc(input.refundCents ?? 0));
	const commissionPercent = input.commissionPercent ?? percentFromConfig();
	if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > MAX_COMMISSION_PERCENT) {
		throw new Error(`Commission percent must be between 0 and ${MAX_COMMISSION_PERCENT}.`);
	}

	const settledBeforeCommission = Math.max(
		0,
		grossCents - discountCents + shippingCents + taxCents - refundCents,
	);
	const commissionCents = Math.min(
		settledBeforeCommission,
		Math.round((settledBeforeCommission * commissionPercent) / 100),
	);

	return {
		grossCents,
		discountCents,
		shippingCents,
		taxCents,
		providerFeeCents,
		commissionCents,
		sellerPayableCents: settledBeforeCommission - commissionCents,
	};
}

export type ProportionalAllocation = { key: string; cents: number };

/** Largest-remainder allocation with a stable key tie-breaker. */
export function allocateProportionally(
	totalCents: number,
	weights: Array<{ key: string; weightCents: number }>,
): ProportionalAllocation[] {
	const total = Math.max(0, Math.trunc(totalCents));
	const positive = weights.map((item) => ({ ...item, weightCents: Math.max(0, Math.trunc(item.weightCents)) }));
	const weightTotal = positive.reduce((sum, item) => sum + item.weightCents, 0);
	if (total === 0 || weightTotal === 0) return positive.map(({ key }) => ({ key, cents: 0 }));

	const rows = positive.map((item) => {
		const exact = (total * item.weightCents) / weightTotal;
		const floor = Math.floor(exact);
		return { key: item.key, cents: floor, remainder: exact - floor };
	});
	let remaining = total - rows.reduce((sum, row) => sum + row.cents, 0);
	rows.sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key));
	for (let index = 0; index < rows.length && remaining > 0; index += 1, remaining -= 1) rows[index].cents += 1;
	return rows.sort((a, b) => a.key.localeCompare(b.key)).map(({ key, cents }) => ({ key, cents }));
}

