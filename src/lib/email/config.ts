import 'server-only';

export type EmailDeliveryConfig = {
	provider: string;
	host?: string;
	port: number;
	secure: boolean;
	requireTls: boolean;
	user: string;
	pass: string;
	from: string;
};

function positiveInteger(value: string | undefined, fallback: number) {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function emailNotificationsEnabled() {
	return process.env.EMAIL_NOTIFICATIONS_ENABLED?.toLowerCase() === 'true';
}

export function emailOutboxBatchSize() {
	return Math.min(
		100,
		positiveInteger(process.env.EMAIL_OUTBOX_BATCH_SIZE, 20),
	);
}

export function emailOutboxMaxAttempts() {
	return Math.min(
		20,
		positiveInteger(process.env.EMAIL_OUTBOX_MAX_ATTEMPTS, 5),
	);
}

function boundedInteger(value: string | undefined, fallback: number, max: number) {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? Math.min(max, parsed) : fallback;
}

export function demoFulfillmentAutomationEnabled() {
	return process.env.DEMO_FULFILLMENT_AUTOMATION_ENABLED?.toLowerCase() === 'true';
}

export function demoFulfillmentStepHours() {
	return Math.max(24, boundedInteger(process.env.DEMO_FULFILLMENT_STEP_HOURS, 24, 24 * 30));
}

export function demoFulfillmentBatchSize() {
	return boundedInteger(process.env.DEMO_FULFILLMENT_BATCH_SIZE, 100, 100);
}

export function getEmailDeliveryConfig(): EmailDeliveryConfig {
	const provider = (process.env.SMTP_PROVIDER || 'smtp').trim().toLowerCase();
	const port = positiveInteger(
		process.env.SMTP_PORT,
		provider === 'gmail' ? 465 : 587,
	);
	const secure =
		process.env.SMTP_SECURE === undefined
			? port === 465
			: process.env.SMTP_SECURE.toLowerCase() === 'true';
	const requireTls =
		process.env.SMTP_REQUIRE_TLS === undefined
			? !secure
			: process.env.SMTP_REQUIRE_TLS.toLowerCase() === 'true';
	const host = process.env.SMTP_HOST?.trim();
	const user = process.env.SMTP_USER?.trim();
	const pass = process.env.SMTP_PASS?.trim();
	const from = process.env.SMTP_FROM?.trim();

	if (provider !== 'gmail' && !host) {
		throw new Error(
			'SMTP_HOST is required when email notifications are enabled.',
		);
	}
	if (!user || !pass || !from) {
		throw new Error(
			'SMTP_USER, SMTP_PASS, and SMTP_FROM are required when email notifications are enabled.',
		);
	}

	return {
		provider,
		host,
		port,
		secure,
		requireTls,
		user,
		pass,
		from,
	};
}
