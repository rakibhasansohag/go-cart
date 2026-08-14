'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleAlert, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AccountStatus = 'PENDING' | 'ACTIVE' | 'RESTRICTED' | 'REJECTED';

type Account = {
	status: AccountStatus;
	providerAccountId: string;
	lastCheckedAt: string | null;
} | null;

export default function StripeConnectCard({ storeUrl }: { storeUrl: string }) {
	const [account, setAccount] = useState<Account>(null);
	const [loading, setLoading] = useState(true);
	const [starting, setStarting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		fetch(`/api/stripe/connect/status?storeUrl=${encodeURIComponent(storeUrl)}`, { cache: 'no-store' })
			.then(async (response) => {
				const data = (await response.json()) as { account?: Account; error?: string };
				if (!response.ok) throw new Error(data.error ?? 'Unable to load payout status.');
				if (active) setAccount(data.account ?? null);
			})
			.catch((reason: unknown) => {
				if (active) setError(reason instanceof Error ? reason.message : 'Unable to load payout status.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [storeUrl]);

	async function startOnboarding() {
		setStarting(true);
		setError(null);
		try {
			const response = await fetch('/api/stripe/connect/onboarding', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ storeUrl }),
			});
			const data = (await response.json()) as { url?: string; error?: string };
			if (!response.ok || !data.url) throw new Error(data.error ?? 'Unable to start Stripe onboarding.');
			window.location.assign(data.url);
		} catch (reason: unknown) {
			setError(reason instanceof Error ? reason.message : 'Unable to start Stripe onboarding.');
			setStarting(false);
		}
	}

	const active = account?.status === 'ACTIVE';
	const restricted = account?.status === 'RESTRICTED' || account?.status === 'REJECTED';

	return (
		<section aria-labelledby='stripe-connect-heading' className='mb-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6'>
			<div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
				<div className='flex gap-3'>
					<span className='grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary'><ShieldCheck className='size-5' /></span>
					<div>
						<h2 id='stripe-connect-heading' className='text-lg font-semibold'>Seller payouts</h2>
						<p className='mt-1 max-w-2xl text-sm leading-6 text-muted-foreground'>Connect Stripe once to receive cleared weekly earnings. If setup is paused or the link expires, GoCart creates a fresh secure link automatically.</p>
					</div>
				</div>
				{loading ? <Loader2 aria-label='Checking payout status' className='size-5 animate-spin text-muted-foreground motion-reduce:animate-none' /> : active ? <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600'><CheckCircle2 className='size-4' /> Ready</span> : <Button onClick={startOnboarding} disabled={starting}>{starting ? <Loader2 className='animate-spin motion-reduce:animate-none' /> : <ArrowUpRight />} {account ? 'Continue setup' : 'Connect payouts'}</Button>}
			</div>
			<div aria-live='polite' className='mt-4 text-sm'>
				{active && <p className='text-emerald-600'>Your Stripe transfer capability is active. GoCart can include you in an approved payday batch.</p>}
				{account?.status === 'PENDING' && <p className='text-muted-foreground'>Your account is created, but Stripe still needs the remaining setup details.</p>}
				{restricted && <p className='flex items-center gap-2 text-amber-600'><CircleAlert className='size-4' /> Stripe needs attention before payouts can be released.</p>}
				{error && <p className='text-destructive'>{error}</p>}
			</div>
		</section>
	);
}
