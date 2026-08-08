import { PrismaClient } from '@prisma/client';

const stagingUrl = process.env.STAGING_DATABASE_URL;
if (process.env.APP_ENV !== 'staging') {
	throw new Error('Refusing to anonymize: set APP_ENV=staging.');
}
if (process.env.STAGING_DATABASE_CONFIRM !== 'ANONYMIZE_STAGING_BRANCH') {
	throw new Error(
		'Refusing to anonymize: set STAGING_DATABASE_CONFIRM=ANONYMIZE_STAGING_BRANCH.',
	);
}
if (!stagingUrl) {
	throw new Error('Refusing to anonymize: STAGING_DATABASE_URL is required.');
}

const db = new PrismaClient({ datasources: { db: { url: stagingUrl } } });

async function main() {
	await db.$transaction(async (tx) => {
		await tx.$executeRawUnsafe(`
			UPDATE "User"
			SET email = 'staging+' || left(md5(id), 20) || '@example.invalid',
				name = 'Staging User ' || left(md5(id), 8),
				picture = 'https://example.invalid/staging-avatar/' || id
		`);

		await tx.$executeRawUnsafe(`
			UPDATE "Store"
			SET name = 'Staging Store ' || left(md5(id), 8),
				description = 'Anonymized staging store.',
				email = 'staging-store+' || left(md5(id), 20) || '@example.invalid',
				phone = '+1555' || right(regexp_replace(id, '[^0-9]', '', 'g'), 7),
				logo = 'https://example.invalid/staging-store/' || id || '/logo',
				cover = 'https://example.invalid/staging-store/' || id || '/cover'
		`);

		await tx.$executeRawUnsafe(`
			UPDATE "ShippingAddress"
			SET "firstName" = 'Staging',
				"lastName" = 'Customer ' || left(md5(id), 8),
				phone = '+1555' || right(regexp_replace(id, '[^0-9]', '', 'g'), 7),
				address1 = '100 Staging Test Avenue',
				address2 = NULL,
				city = 'Testville',
				state = 'TS',
				zip_code = '00000'
		`);

		await tx.$executeRawUnsafe(`
			UPDATE "Review"
			SET review = 'Anonymized staging review.',
				color = 'staging',
				size = 'staging',
				quantity = '1'
		`);
		await tx.$executeRawUnsafe(`UPDATE "ReviewImage" SET url = 'https://example.invalid/staging-review/' || id`);
		await tx.$executeRawUnsafe(`UPDATE "Question" SET question = 'Anonymized staging question.', answer = 'Anonymized staging answer.'`);
		await tx.$executeRawUnsafe(`UPDATE "ReturnEvidence" SET url = 'https://example.invalid/staging-evidence/' || id, alt = 'Staging evidence'`);
		await tx.$executeRawUnsafe(`UPDATE "ReturnRequest" SET "customerNote" = NULL, "sellerNote" = NULL, "adminNote" = NULL`);

		await tx.$executeRawUnsafe(`
			UPDATE "PaymentDetails"
			SET "paymentInetntId" = 'staging-intent-' || id,
				"providerCaptureId" = 'staging-capture-' || id
		`);
		await tx.$executeRawUnsafe(`
			UPDATE "PaymentEvent"
			SET "providerEventId" = 'staging-event-' || id,
				"providerPaymentId" = 'staging-payment-' || id,
				metadata = jsonb_build_object('staging', true)
		`);
		await tx.$executeRawUnsafe(`
			UPDATE "RefundTransaction"
			SET "providerRefundId" = 'staging-refund-' || id,
				"idempotencyKey" = 'staging-idempotency-' || id,
				"providerResponse" = jsonb_build_object('staging', true),
				"failureReason" = NULL
		`);

		await tx.$executeRawUnsafe(`
			UPDATE "EmailOutbox"
			SET "recipientEmail" = 'staging-mail+' || left(md5(id), 20) || '@example.invalid',
				payload = jsonb_build_object('staging', true),
				"lastError" = NULL
		`);
		await tx.$executeRawUnsafe(`UPDATE "DomainEvent" SET payload = jsonb_build_object('staging', true)`);
		await tx.$executeRawUnsafe(`UPDATE "ReturnEvent" SET note = NULL, metadata = jsonb_build_object('staging', true)`);
	});

	console.log('Staging database anonymization completed. IDs, roles, relationships, statuses, and totals were preserved.');
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
