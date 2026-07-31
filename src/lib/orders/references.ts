const FRIENDLY_REFERENCE_PREFIX = /^#?(?:ORD|PKG)[\s-]*/i;

function formatReference(id: string, prefix: 'ORD' | 'PKG') {
	if (!id) return '';
	const clean = id.replace(/-/g, '').toUpperCase();
	return `#${prefix}-${clean.slice(-7)}`;
}

export function formatOrderId(id: string) {
	return formatReference(id, 'ORD');
}

export function formatPackageId(id: string) {
	return formatReference(id, 'PKG');
}

/**
 * Turns friendly references back into the UUID fragment stored by Prisma.
 * Other search text is preserved so this can be shared by customer, seller,
 * and administrator order searches.
 */
export function normalizeCommerceReference(input: string) {
	const trimmed = input.trim();
	if (!trimmed) return '';

	const normalized = trimmed.replace(FRIENDLY_REFERENCE_PREFIX, '').trim();
	return normalized || trimmed;
}
