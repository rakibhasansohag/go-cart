'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function RetryAuthClient({
	redirectTo = '/sign-in?redirect=/profile/payment',
	maxAttempts = 2,
	delay = 700,
}: {
	redirectTo?: string;
	maxAttempts?: number;
	delay?: number;
}) {
	const attempts = useRef(0);
	const router = useRouter();

	useEffect(() => {
		if (attempts.current >= maxAttempts) {
			// give up and send to sign-in
			router.replace(redirectTo);
			return;
		}

		attempts.current += 1;
		const t = setTimeout(() => {
			// simple reload to re-send cookies (second try usually succeeds)
			// you could also router.replace(router.asPath) if you prefer SPA navigation
			location.reload();
		}, delay);

		return () => clearTimeout(t);
	}, [router, redirectTo, delay, maxAttempts]);

	return (
		<div className='flex flex-col items-center justify-center p-6'>
			<div className='animate-spin h-8 w-8 border-b-2 border-r-2 rounded-full mb-3' />
			<div className='text-sm text-slate-600'>
				Verifying session — one moment...
			</div>
		</div>
	);
}
