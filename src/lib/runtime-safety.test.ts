import { beforeEach, describe, expect, it } from 'vitest';
import { assertSafeE2ERuntime } from './runtime-safety';

const originalEnv = { ...process.env };

beforeEach(() => {
	process.env = { ...originalEnv };
});

describe('assertSafeE2ERuntime', () => {
	it('does nothing when E2E mode is disabled', () => {
		delete process.env.E2E_TEST_MODE;
		expect(() => assertSafeE2ERuntime()).not.toThrow();
	});

	it('rejects E2E mode without an explicit staging contract', () => {
		process.env.E2E_TEST_MODE = 'true';
		delete process.env.APP_ENV;

		expect(() => assertSafeE2ERuntime()).toThrow(/APP_ENV/);
	});

	it('rejects a database URL mismatch', () => {
		process.env.E2E_TEST_MODE = 'true';
		process.env.APP_ENV = 'staging';
		process.env.E2E_DATABASE_URL = 'postgresql://isolated';
		process.env.DATABASE_URL = 'postgresql://different';
		process.env.E2E_AUTH_MODE = 'test';
		process.env.E2E_PROVIDER_MODE = 'sandbox';

		expect(() => assertSafeE2ERuntime()).toThrow(/must match/);
	});

	it('rejects live payment credentials', () => {
		process.env.E2E_TEST_MODE = 'true';
		process.env.APP_ENV = 'staging';
		process.env.E2E_DATABASE_URL = 'postgresql://isolated';
		process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
		process.env.E2E_AUTH_MODE = 'test';
		process.env.E2E_PROVIDER_MODE = 'sandbox';
		process.env.STRIPE_SECRET_KEY = 'sk_live_forbidden';

		expect(() => assertSafeE2ERuntime()).toThrow(/Live Stripe/);
	});
});
