import { describe, expect, it } from 'vitest';
import {
	formatOrderId,
	formatPackageId,
	normalizeCommerceReference,
} from './references';

describe('commerce references', () => {
	const uuid = 'b8810f34-efed-4c68-8b59-c6dc5ca8304b';

	it('formats distinct order and package references', () => {
		expect(formatOrderId(uuid)).toBe('#ORD-CA8304B');
		expect(formatPackageId(uuid)).toBe('#PKG-CA8304B');
	});

	it.each([
		['#ORD-CA8304B', 'CA8304B'],
		['ORD-CA8304B', 'CA8304B'],
		['#PKG-DA93AB2', 'DA93AB2'],
		['pkg DA93AB2', 'DA93AB2'],
		['DA93AB2', 'DA93AB2'],
		[uuid, uuid],
	])('normalizes %s for database lookup', (input, expected) => {
		expect(normalizeCommerceReference(input)).toBe(expected);
	});

	it('preserves ordinary text searches', () => {
		expect(normalizeCommerceReference('Crafted Compass')).toBe(
			'Crafted Compass',
		);
	});
});
