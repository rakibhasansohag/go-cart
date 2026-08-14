import { describe, expect, it } from 'vitest';

import { accountStatusFromCapability, buildAccountsV2IncludeQuery } from './connect';

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

describe('buildAccountsV2IncludeQuery', () => {
	it('uses indexed include parameters required by Accounts v2', () => {
		const query = new URLSearchParams(buildAccountsV2IncludeQuery());

		expect(query.get('include[0]')).toBe('configuration.recipient');
		expect(query.get('include[1]')).toBe('identity');
		expect(query.get('include[2]')).toBe('requirements');
		expect(buildAccountsV2IncludeQuery()).not.toContain('include%5B%5D');
	});
});
