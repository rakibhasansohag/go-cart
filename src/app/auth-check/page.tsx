'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function AuthCheckPage() {
	const router = useRouter();
	const { isLoaded, isSignedIn } = useUser();

	const [tries, setTries] = useState(0);
	const [message, setMessage] = useState('Verifying your session…');

	const redirectedRef = useRef(false);
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isLoaded) return; // wait until clerk client initialized
		if (redirectedRef.current) return; // already navigated

		// compute redirect target once and reuse
		const searchParams = new URLSearchParams(window.location.search);
		const redirectTarget = searchParams.get('redirect_url') ?? '/';

		// if signed in, navigate once and stop
		if (isSignedIn) {
			redirectedRef.current = true;
			setMessage('Session restored. Redirecting…');
			try {
				router.replace(redirectTarget);
			} catch (err) {
				console.error('router.replace failed', err);
			}
			return;
		}

		// if exceeded attempts to send to sign-in
		if (tries >= 3) {
			redirectedRef.current = true;
			setMessage("Couldn't restore session — redirecting to sign-in…");
			// short delay to allow message to show
			timerRef.current = window.setTimeout(() => {
				try {
					router.replace(
						`/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}`,
					);
				} catch (err) {
					console.error('router.replace failed', err);
				}
			}, 700);
			return;
		}

		// otherwise schedule next try
		setMessage(`Trying to recover your session… (attempt ${tries + 1})`);
		timerRef.current = window.setTimeout(() => {
			// functional update no stale closure
			setTries((s) => s + 1);
		}, 800);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [isLoaded, isSignedIn, tries, router]);

	return (
		<div className='min-h-screen grid place-items-center p-6 bg-background'>
			<div className='text-center max-w-lg'>
				<div className='mb-6'>
					<div className='inline-block w-20 h-20 rounded-full bg-gradient-to-br from-[#ff7a4d] to-[#7c3aed] animate-spin-slow' />
				</div>
				<h2 className='text-lg font-bold mb-2'>Checking your session</h2>
				<p className='text-sm text-muted-foreground'>{message}</p>

				<div className='mt-6'>
					<button
						className='px-4 py-2 rounded bg-primary text-main-secondary'
						onClick={() => {
							// manual retry
							if (!redirectedRef.current) {
								setTries(0);
								setMessage('Retrying now…');
								// reload so middleware runs again
								window.location.reload();
							}
						}}
					>
						Retry now
					</button>
				</div>

				<div className='mt-4 text-xs text-slate-400'>
					If this continues, please check your system clock and refresh the
					page.
				</div>
			</div>
		</div>
	);
}
