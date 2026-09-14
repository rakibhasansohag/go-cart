import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const harness = vi.hoisted(() => ({
	getOrCreateStripeOnboardingLink: vi.fn(),
	requireSameOriginMutation: vi.fn(),
}));

vi.mock('@/lib/payments/connect', () => ({
	ConnectRequestError: class ConnectRequestError extends Error {
		constructor(
			message: string,
			public readonly status: 400 | 401 | 403 | 404 | 500 = 500,
		) {
			super(message);
			this.name = 'ConnectRequestError';
		}
	},
	getOrCreateStripeOnboardingLink: harness.getOrCreateStripeOnboardingLink,
}));

vi.mock('@/lib/security/request-guards', () => ({
	requireSameOriginMutation: harness.requireSameOriginMutation,
	RequestGuardError: class RequestGuardError extends Error {
		constructor(public readonly status: 401 | 403, message: string) {
			super(message);
		}
	},
}));

import { GET, POST } from './route';

describe('/api/seller/stripe/onboard route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET handler', () => {
		it('returns 400 when storeUrl query param is missing', async () => {
			const request = new NextRequest('http://localhost:3000/api/seller/stripe/onboard');
			const response = await GET(request);

			expect(response.status).toBe(400);
			const json = await response.json();
			expect(json.error).toBe('Store URL query parameter is required.');
		});

		it('redirects to Stripe onboarding URL on success', async () => {
			harness.getOrCreateStripeOnboardingLink.mockResolvedValue({
				url: 'https://connect.stripe.com/setup/s/mock-link-123',
			});

			const request = new NextRequest(
				'http://localhost:3000/api/seller/stripe/onboard?storeUrl=my-store',
			);
			const response = await GET(request);

			expect(response.status).toBe(307);
			expect(response.headers.get('location')).toBe(
				'https://connect.stripe.com/setup/s/mock-link-123',
			);
		});

		it('returns error status when ConnectRequestError is thrown', async () => {
			const { ConnectRequestError } = await import('@/lib/payments/connect');
			harness.getOrCreateStripeOnboardingLink.mockRejectedValue(
				new ConnectRequestError('Sign in as a seller to connect payouts.', 401),
			);

			const request = new NextRequest(
				'http://localhost:3000/api/seller/stripe/onboard?storeUrl=my-store',
			);
			const response = await GET(request);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json.error).toBe('Sign in as a seller to connect payouts.');
		});
	});

	describe('POST handler', () => {
		it('returns 400 when storeUrl is missing from body', async () => {
			const request = new NextRequest(
				'http://localhost:3000/api/seller/stripe/onboard',
				{
					method: 'POST',
					body: JSON.stringify({}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(400);
			const json = await response.json();
			expect(json.error).toBe('Store URL is required.');
		});

		it('returns JSON payload on successful onboarding link creation', async () => {
			harness.getOrCreateStripeOnboardingLink.mockResolvedValue({
				url: 'https://connect.stripe.com/setup/s/mock-link-post',
				expiresAt: '2026-09-15T00:00:00.000Z',
				status: 'PENDING',
				accountId: 'acct_123',
			});

			const request = new NextRequest(
				'http://localhost:3000/api/seller/stripe/onboard',
				{
					method: 'POST',
					body: JSON.stringify({ storeUrl: 'my-store' }),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json).toEqual({
				url: 'https://connect.stripe.com/setup/s/mock-link-post',
				expiresAt: '2026-09-15T00:00:00.000Z',
				status: 'PENDING',
				accountId: 'acct_123',
			});
		});
	});
});
