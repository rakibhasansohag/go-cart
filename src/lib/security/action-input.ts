/** Reject runtime fields that TypeScript alone cannot constrain. */
export function pickActionFields<T extends object, K extends keyof T>(
	input: T,
	fields: readonly K[],
	acceptedMetadata: readonly string[] = [],
): Pick<T, K> {
	const allowed = new Set<string>([...fields.map(String), ...acceptedMetadata]);
	if (Object.keys(input).some((key) => !allowed.has(key))) {
		throw new Error('Unsupported fields in request.');
	}
	return Object.fromEntries(
		fields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
	) as Pick<T, K>;
}

export function requirePositiveQuantity(quantity: number): number {
	if (!Number.isSafeInteger(quantity) || quantity <= 0) {
		throw new Error('Quantity must be a positive integer.');
	}
	return quantity;
}
