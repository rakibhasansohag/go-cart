import { currentUser } from '@clerk/nextjs/server';
import type { PaymentAccountStatus, StorePaymentAccount } from '@prisma/client';

import { db } from '@/lib/db';
import { getStripeClient } from '@/lib/payments/stripe-client';

// Accounts v2 is currently a Stripe preview API. Keep this version scoped to
// raw Accounts v2 requests so the rest of the Stripe SDK remains on its
// configured stable API version.
const STRIPE_ACCOUNTS_V2_PREVIEW_VERSION = '2026-07-29.preview';
const STRIPE_ACCOUNTS_V2_INCLUDE_FIELDS = [
	'configuration.recipient',
	'identity',
	'requirements',
] as const;

type ConnectAccountSnapshot = {
	id?: string;
	identity?: { country?: string | null } | null;
	configuration?: {
		recipient?: {
			capabilities?: {
				stripe_balance?: {
					stripe_transfers?: { status?: string | null } | null;
				} | null;
			} | null;
		} | null;
	} | null;
};

export class ConnectRequestError extends Error {
	constructor(
		message: string,
		public readonly status: 400 | 401 | 403 | 404 | 500 = 500,
	) {
		super(message);
		this.name = 'ConnectRequestError';
	}
}

export function accountStatusFromCapability(status?: string | null): PaymentAccountStatus {
	switch (status) {
		case 'active':
			return 'ACTIVE';
		case 'rejected':
			return 'REJECTED';
		case 'restricted':
			return 'RESTRICTED';
		default:
			return 'PENDING';
	}
}

function readAccountSnapshot(value: unknown): ConnectAccountSnapshot {
	return value && typeof value === 'object' ? (value as ConnectAccountSnapshot) : {};
}

export function buildAccountsV2IncludeQuery() {
	const query = new URLSearchParams();
	STRIPE_ACCOUNTS_V2_INCLUDE_FIELDS.forEach((field, index) => {
		query.set(`include[${index}]`, field);
	});
	return query.toString();
}

async function requireOwnedStore(storeUrl: string) {
	if (!storeUrl) throw new ConnectRequestError('Store URL is required.', 400);

	const user = await currentUser();
	if (!user) throw new ConnectRequestError('Sign in as a seller to connect payouts.', 401);

	const store = await db.store.findFirst({
		where: { url: storeUrl, userId: user.id },
		select: { id: true, url: true, name: true, email: true },
	});

	if (!store) throw new ConnectRequestError('Store not found for this seller.', 404);
	return store;
}

function publicOrigin(request: Request) {
	const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (configured) return configured.replace(/\/$/, '');
	return new URL(request.url).origin;
}

async function createRecipientAccount(store: Awaited<ReturnType<typeof requireOwnedStore>>) {
	const stripe = getStripeClient();
	const result = await stripe.rawRequest(
		'POST',
		'/v2/core/accounts',
		{
			contact_email: store.email,
			dashboard: 'express',
			defaults: {
				responsibilities: {
					fees_collector: 'application',
					losses_collector: 'application',
				},
			},
			identity: { country: 'us' },
			configuration: {
				recipient: {
					capabilities: {
						stripe_balance: {
							stripe_transfers: { requested: true },
						},
					},
				},
			},
			include: ['configuration.recipient', 'identity', 'requirements'],
		},
		{
			idempotencyKey: `gocart-connect-account:${store.id}`,
			apiVersion: STRIPE_ACCOUNTS_V2_PREVIEW_VERSION,
		},
	);

	const snapshot = readAccountSnapshot(result);
	if (!snapshot.id) throw new Error('Stripe did not return a connected account ID.');
	return { id: snapshot.id, snapshot };
}

async function retrieveRecipientAccount(providerAccountId: string) {
	const stripe = getStripeClient();
	const result = await stripe.rawRequest(
		'GET',
		`/v2/core/accounts/${encodeURIComponent(providerAccountId)}?${buildAccountsV2IncludeQuery()}`,
		undefined,
		{ apiVersion: STRIPE_ACCOUNTS_V2_PREVIEW_VERSION },
	);
	return readAccountSnapshot(result);
}

async function saveAccountSnapshot(
	storeId: string,
	providerAccountId: string,
	snapshot: ConnectAccountSnapshot,
) {
	const capability =
		snapshot.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers
			?.status;
	const status = accountStatusFromCapability(capability);

	return db.storePaymentAccount.upsert({
		where: { storeId },
		create: {
			storeId,
			providerAccountId,
			status,
			country: snapshot.identity?.country ?? null,
			transfersCapability: capability ?? null,
			detailsSubmitted: status === 'ACTIVE',
			lastCheckedAt: new Date(),
		},
		update: {
			providerAccountId,
			status,
			country: snapshot.identity?.country ?? undefined,
			transfersCapability: capability ?? null,
			detailsSubmitted: status === 'ACTIVE',
			lastCheckedAt: new Date(),
		},
	});
}

export async function getOrCreateStripeOnboardingLink(
	request: Request,
	storeUrl: string,
) {
	const store = await requireOwnedStore(storeUrl);
	let paymentAccount = await db.storePaymentAccount.findUnique({ where: { storeId: store.id } });
	let snapshot: ConnectAccountSnapshot | undefined;

	if (!paymentAccount) {
		const created = await createRecipientAccount(store);
		paymentAccount = await saveAccountSnapshot(store.id, created.id, created.snapshot);
		snapshot = created.snapshot;
	}

	const stripe = getStripeClient();
	const origin = publicOrigin(request);
	const link = await stripe.accountLinks.create({
		account: paymentAccount.providerAccountId,
		type: 'account_onboarding',
		refresh_url: `${origin}/api/stripe/connect/refresh?storeUrl=${encodeURIComponent(store.url)}`,
		return_url: `${origin}/api/stripe/connect/return?storeUrl=${encodeURIComponent(store.url)}`,
	});

	return {
		url: link.url,
		expiresAt: new Date(link.expires_at * 1000).toISOString(),
		status: paymentAccount.status,
		accountId: paymentAccount.providerAccountId,
		needsStatusRefresh: !snapshot,
	};
}

export async function refreshStripePaymentAccount(storeUrl: string) {
	const store = await requireOwnedStore(storeUrl);
	const paymentAccount = await db.storePaymentAccount.findUnique({ where: { storeId: store.id } });
	if (!paymentAccount) throw new ConnectRequestError('Start Stripe onboarding first.', 404);

	const snapshot = await retrieveRecipientAccount(paymentAccount.providerAccountId);
	return saveAccountSnapshot(store.id, paymentAccount.providerAccountId, snapshot);
}

export async function getStripePaymentAccountStatus(storeUrl: string) {
	const store = await requireOwnedStore(storeUrl);
	const paymentAccount = await db.storePaymentAccount.findUnique({ where: { storeId: store.id } });
	if (!paymentAccount) return null;

	const snapshot = await retrieveRecipientAccount(paymentAccount.providerAccountId);
	return saveAccountSnapshot(store.id, paymentAccount.providerAccountId, snapshot);
}

export type StripePaymentAccount = StorePaymentAccount;
