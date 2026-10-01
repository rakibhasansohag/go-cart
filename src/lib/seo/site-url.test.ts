import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSiteUrl } from './site-url';

afterEach(() => vi.unstubAllEnvs());

describe('public SEO origin', () => {
	it('uses the configured public origin over deployment domains', () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://shop.example.com/');
		vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'shop.vercel.app');
		vi.stubEnv('VERCEL_URL', 'shop-random-private.vercel.app');
		expect(getSiteUrl()).toBe('https://shop.example.com');
	});

	it('uses the stable Vercel production domain, never the deployment URL', () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
		vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'shop.vercel.app');
		vi.stubEnv('VERCEL_URL', 'shop-random-private.vercel.app');
		expect(getSiteUrl()).toBe('https://shop.vercel.app');
	});

	it('falls back to the confirmed public GoCart domain in production', () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
		vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
		vi.stubEnv('NODE_ENV', 'production');
		expect(getSiteUrl()).toBe('https://go-cart-iota-eight.vercel.app');
	});

	it('keeps local development local', () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
		vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
		vi.stubEnv('NODE_ENV', 'development');
		expect(getSiteUrl()).toBe('http://localhost:3000');
	});

	it('rejects credentials and non-web schemes', () => {
		for (const url of ['https://user:password@example.com', 'javascript:alert(1)']) {
			vi.stubEnv('NEXT_PUBLIC_APP_URL', url);
			expect(() => getSiteUrl()).toThrow();
		}
	});
});
