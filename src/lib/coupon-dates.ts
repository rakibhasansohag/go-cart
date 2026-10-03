/** Serialize picker values as instants, preserving the browser's selected local time. */
export function couponTimestamp(value: Date | string | null): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function isExplicitCouponTimestamp(value: string): boolean {
	return /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value));
}
