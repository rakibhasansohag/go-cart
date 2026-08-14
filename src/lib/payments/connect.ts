import { currentUser } from '@clerk/nextjs/server';
import type { PaymentAccountStatus, SellerPaymentAccount } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';

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
	requirements?: { currently_due?: unknown[] | null; past_due?: unknown[] | null } | null;
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

function requirementsDueCount(snapshot: ConnectAccountSnapshot) {
	return (snapshot.requirements?.currently_due?.length ?? 0) + (snapshot.requirements?.past_due?.length ?? 0);
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
		select: { id: true, url: true, name: true, email: true, userId: true },
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
			idempotencyKey: `gocart-connect-account:seller:${store.userId}`,
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
	userId: string,
	providerAccountId: string,
	snapshot: ConnectAccountSnapshot,
) {
	const capability =
		snapshot.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers
			?.status;
	const status = accountStatusFromCapability(capability);

	return db.sellerPaymentAccount.upsert({
		where: { userId },
		create: {
			userId,
			providerAccountId,
			status,
			country: snapshot.identity?.country ?? null,
			transfersCapability: capability ?? null,
			detailsSubmitted: status === 'ACTIVE',
			requirementsDueCount: requirementsDueCount(snapshot),
			lastCheckedAt: new Date(),
		},
		update: {
			providerAccountId,
			status,
			country: snapshot.identity?.country ?? undefined,
			transfersCapability: capability ?? null,
			detailsSubmitted: status === 'ACTIVE',
			requirementsDueCount: requirementsDueCount(snapshot),
			lastCheckedAt: new Date(),
		},
	});
}

export async function getOrCreateStripeOnboardingLink(
	request: Request,
	storeUrl: string,
) {
	const store = await requireOwnedStore(storeUrl);
	let paymentAccount = await db.sellerPaymentAccount.findUnique({ where: { userId: store.userId } });
	let snapshot: ConnectAccountSnapshot | undefined;

	if (!paymentAccount) {
		const created = await createRecipientAccount(store);
		paymentAccount = await saveAccountSnapshot(store.userId, created.id, created.snapshot);
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
	const paymentAccount = await db.sellerPaymentAccount.findUnique({ where: { userId: store.userId } });
	if (!paymentAccount) throw new ConnectRequestError('Start Stripe onboarding first.', 404);

	const snapshot = await retrieveRecipientAccount(paymentAccount.providerAccountId);
	return saveAccountSnapshot(store.userId, paymentAccount.providerAccountId, snapshot);
}

export async function getStripePaymentAccountStatus(storeUrl: string) {
	const store = await requireOwnedStore(storeUrl);
	const paymentAccount = await db.sellerPaymentAccount.findUnique({ where: { userId: store.userId } });
	if (!paymentAccount) return null;

	const snapshot = await retrieveRecipientAccount(paymentAccount.providerAccountId);
	return saveAccountSnapshot(store.userId, paymentAccount.providerAccountId, snapshot);
}

export type StripePaymentAccount = SellerPaymentAccount;

export async function refreshStripeAccountBalance(providerAccountId: string) {
	const stripe = getStripeClient();
	const balance = await stripe.balance.retrieve({}, { stripeAccount: providerAccountId });
	const availableBalanceCents = balance.available.filter((item) => item.currency === 'usd').reduce((sum, item) => sum + item.amount, 0);
	const pendingBalanceCents = balance.pending.filter((item) => item.currency === 'usd').reduce((sum, item) => sum + item.amount, 0);
	return db.sellerPaymentAccount.update({
		where: { providerAccountId },
		data: { availableBalanceCents, pendingBalanceCents, lastCheckedAt: new Date() },
	});
}

/** Reconciles platform webhook snapshots without persisting KYC or bank data. */
export async function reconcileStripeAccountUpdatedEvent(event: Stripe.Event) {
	const account = event.data.object as Stripe.Account;
	const providerAccountId = account.id || event.account;
	if (!providerAccountId) return { ignored: true };
	const paymentAccount = await db.sellerPaymentAccount.findUnique({ where: { providerAccountId } });
	if (!paymentAccount) return { ignored: true };
	try {
		await db.$transaction(async (tx) => {
			await tx.sellerPaymentAccountEvent.create({
				data: {
					providerEventId: event.id,
					providerAccountId,
					eventType: event.type,
					payload: { id: providerAccountId, country: account.country ?? null, detailsSubmitted: account.details_submitted ?? false, transfers: account.capabilities?.transfers ?? null },
				},
			});
			const capability = account.capabilities?.transfers ?? null;
			await tx.sellerPaymentAccount.update({
				where: { providerAccountId },
				data: {
					country: account.country ?? undefined,
					transfersCapability: capability,
					status: accountStatusFromCapability(capability),
					detailsSubmitted: account.details_submitted ?? false,
					requirementsDueCount: (account.requirements?.currently_due?.length ?? 0) + (account.requirements?.past_due?.length ?? 0),
					lastCheckedAt: new Date(),
				},
			});
		});
		return { duplicate: false };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { duplicate: true };
		throw error;
	}
}
