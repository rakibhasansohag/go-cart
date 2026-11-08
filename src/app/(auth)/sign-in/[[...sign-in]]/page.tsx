'use client';

import { useRef, useState } from 'react';
import { SignedOut, SignIn, useSignIn } from '@clerk/nextjs';
import { DemoAccountCard } from '@/components/shared/demo-account-card';
import type { DEMO_ACCOUNTS } from '@/lib/demo-accounts';

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];

export default function SignInPage() {
	const { isLoaded, signIn, setActive } = useSignIn();
	const inFlight = useRef(false);
	const [pending, setPending] = useState<DemoAccount['role'] | null>(null);
	const [error, setError] = useState('');

	async function signInAsDemo(account: DemoAccount) {
		if (!isLoaded || inFlight.current) return;
		inFlight.current = true;
		setError('');
		setPending(account.role);

		try {
			const attempt = await signIn.create({ identifier: account.email, password: account.password });
			if (attempt.status !== 'complete' || !attempt.createdSessionId) {
				setError('This demo account needs another verification step. Open Login details and use the regular sign-in form.');
				return;
			}
			await setActive({ session: attempt.createdSessionId, redirectUrl: account.destination });
		} catch {
			setError('Quick sign-in is unavailable for this account. Try again or use Login details to sign in manually.');
		} finally {
			inFlight.current = false;
			setPending(null);
		}
	}

	return (
		<main className='flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:py-12'>
			<SignedOut>
				<div className='flex w-full max-w-5xl flex-col items-center justify-center gap-5 lg:flex-row lg:gap-8'>
					<div inert={pending !== null} className='flex w-full min-w-0 justify-center lg:w-auto'>
						<SignIn path='/sign-in' routing='path' signUpUrl='/sign-up' fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/'} />
					</div>
					<div className='w-full max-w-md min-w-0'>
						<DemoAccountCard onSignIn={signInAsDemo} ready={isLoaded} pending={pending} error={error} />
					</div>
				</div>
			</SignedOut>
		</main>
	);
}
