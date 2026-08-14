import { describe, expect, it } from 'vitest';

import { accountStatusFromCapability } from './connect';

describe('accountStatusFromCapability', () => {
	it('marks an active transfer capability as payout-ready', () => {
		expect(accountStatusFromCapability('active')).toBe('ACTIVE');
	});

	it('keeps unknown and pending capabilities safe', () => {
		expect(accountStatusFromCapability()).toBe('PENDING');
		expect(accountStatusFromCapability('pending')).toBe('PENDING');
	});

	it('preserves restricted and rejected provider states', () => {
		expect(accountStatusFromCapability('restricted')).toBe('RESTRICTED');
		expect(accountStatusFromCapability('rejected')).toBe('REJECTED');
	});
});
