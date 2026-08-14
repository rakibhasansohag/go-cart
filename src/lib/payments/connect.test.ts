import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	currentUserMock,
	storeFindFirstMock,
	paymentFindUniqueMock,
	paymentUpsertMock,
	rawRequestMock,
	accountLinksCreateMock,
} = vi.hoisted(() => ({
	currentUserMock: vi.fn(),
	storeFindFirstMock: vi.fn(),
	paymentFindUniqueMock: vi.fn(),
	paymentUpsertMock: vi.fn(),
	rawRequestMock: vi.fn(),
	accountLinksCreateMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ currentUser: currentUserMock }));
vi.mock('@/lib/db', () => ({
	db: {
		store: { findFirst: storeFindFirstMock },
		sellerPaymentAccount: {
			findUnique: paymentFindUniqueMock,
			upsert: paymentUpsertMock,
		},
	},
}));
vi.mock('@/lib/payments/stripe-client', () => ({
	getStripeClient: () => ({
		rawRequest: rawRequestMock,
		accountLinks: { create: accountLinksCreateMock },
	}),
}));

import {
	accountStatusFromCapability,
	buildAccountsV2IncludeQuery,
	getOrCreateStripeOnboardingLink,
} from './connect';

beforeEach(() => {
	currentUserMock.mockReset();
	storeFindFirstMock.mockReset();
	paymentFindUniqueMock.mockReset();
	paymentUpsertMock.mockReset();
	rawRequestMock.mockReset();
	accountLinksCreateMock.mockReset();
});

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

describe('seller-level Stripe account reuse', () => {
	it('reuses one connected account across stores owned by the same seller', async () => {
		const seller = { id: 'seller-1' };
		const account = {
			id: 'payment-account-1',
			userId: seller.id,
			providerAccountId: 'acct_seller_1',
			status: 'PENDING',
		};

		currentUserMock.mockResolvedValue(seller);
		storeFindFirstMock
			.mockResolvedValueOnce({ id: 'store-1', userId: seller.id, url: 'first-store', email: 'seller@example.com' })
			.mockResolvedValueOnce({ id: 'store-2', userId: seller.id, url: 'second-store', email: 'seller@example.com' });
		paymentFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(account);
		paymentUpsertMock.mockResolvedValue(account);
		rawRequestMock.mockResolvedValue({
			id: 'acct_seller_1',
			identity: { country: 'us' },
			configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: 'pending' } } } } },
		});
		accountLinksCreateMock.mockResolvedValue({ url: 'https://connect.stripe.test/onboard', expires_at: 1_800_000_000 });

		await getOrCreateStripeOnboardingLink(new Request('http://localhost:3000'), 'first-store');
		await getOrCreateStripeOnboardingLink(new Request('http://localhost:3000'), 'second-store');

		expect(paymentFindUniqueMock).toHaveBeenNthCalledWith(1, { where: { userId: seller.id } });
		expect(paymentFindUniqueMock).toHaveBeenNthCalledWith(2, { where: { userId: seller.id } });
		expect(paymentUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
		where: { userId: seller.id },
		create: expect.objectContaining({ userId: seller.id }),
	}));
		expect(rawRequestMock).toHaveBeenCalledTimes(1);
		expect(accountLinksCreateMock).toHaveBeenCalledTimes(2);
		expect(accountLinksCreateMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ account: 'acct_seller_1' }));
	});
});
