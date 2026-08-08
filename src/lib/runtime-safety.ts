const TRUE = 'true';

export class RuntimeSafetyError extends Error {
	constructor(message: string) {
		super(`[runtime-safety] ${message}`);
		this.name = 'RuntimeSafetyError';
	}
}

const isTrue = (value: string | undefined) => value?.toLowerCase() === TRUE;

/**
 * E2E mode is deliberately opt-in and fail-closed. The application must never
 * infer that a production deployment is safe to use as a test environment.
 */
export function assertSafeE2ERuntime(): void {
	if (!isTrue(process.env.E2E_TEST_MODE)) return;
	// Unit tests mock server dependencies and must not require a live database.
	if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') return;

	if (!['local', 'staging', 'test'].includes(process.env.APP_ENV ?? '')) {
		throw new RuntimeSafetyError(
			'E2E_TEST_MODE requires APP_ENV=local, staging, or test.',
		);
	}

	const required = [
		['E2E_DATABASE_URL', process.env.E2E_DATABASE_URL],
		['DATABASE_URL', process.env.DATABASE_URL],
		['E2E_AUTH_MODE', process.env.E2E_AUTH_MODE],
		['E2E_PROVIDER_MODE', process.env.E2E_PROVIDER_MODE],
	] as const;

	const missing = required.filter(([, value]) => !value).map(([name]) => name);
	if (missing.length > 0) {
		throw new RuntimeSafetyError(
			`E2E_TEST_MODE is missing required configuration: ${missing.join(', ')}.`,
		);
	}

	if (process.env.E2E_DATABASE_URL !== process.env.DATABASE_URL) {
		throw new RuntimeSafetyError(
			'E2E_DATABASE_URL must match the isolated DATABASE_URL used by the app.',
		);
	}

	if (process.env.E2E_AUTH_MODE !== 'test') {
		throw new RuntimeSafetyError('E2E_AUTH_MODE must be test.');
	}

	if (process.env.E2E_PROVIDER_MODE !== 'sandbox') {
		throw new RuntimeSafetyError('E2E_PROVIDER_MODE must be sandbox.');
	}

	if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
		throw new RuntimeSafetyError('Live Stripe secret keys are forbidden in E2E mode.');
	}

	if (process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY?.startsWith('pk_live_')) {
		throw new RuntimeSafetyError('Live Stripe public keys are forbidden in E2E mode.');
	}

	if (process.env.PAYPAL_API_BASE_URL && !process.env.PAYPAL_API_BASE_URL.includes('sandbox')) {
		throw new RuntimeSafetyError('The PayPal sandbox endpoint is required in E2E mode.');
	}

	if (isTrue(process.env.EMAIL_NOTIFICATIONS_ENABLED)) {
		throw new RuntimeSafetyError('EMAIL_NOTIFICATIONS_ENABLED must be false in E2E mode.');
	}

	if (isTrue(process.env.ABANDONED_CHECKOUT_EMAIL_ENABLED)) {
		throw new RuntimeSafetyError('ABANDONED_CHECKOUT_EMAIL_ENABLED must be false in E2E mode.');
	}

	if (isTrue(process.env.DEMO_FULFILLMENT_AUTOMATION_ENABLED)) {
		throw new RuntimeSafetyError('DEMO_FULFILLMENT_AUTOMATION_ENABLED must be false in E2E mode.');
	}
}
