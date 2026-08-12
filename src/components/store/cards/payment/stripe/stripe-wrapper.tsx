'use client';

import { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useTheme } from 'next-themes';

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;
export default function StripeWrapper({
	children,
	amount,
}: {
	children: ReactNode;
	amount: number;
}) {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === 'dark';

	if (!stripePromise) {
		return (
			<div role='status' className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300'>
				Stripe sandbox payment is not configured for this environment.
			</div>
		);
	}

	return (
		<Elements
			stripe={stripePromise}
			options={{
				mode: 'payment',
				amount: Math.round(amount * 100),
				currency: 'usd',
				appearance: {
					theme: isDark ? 'night' : 'stripe',
					labels: 'above',
					variables: isDark
						? {
								colorPrimary: '#60a5fa',
								colorBackground: '#0f172a',
								colorText: '#f8fafc',
								colorTextSecondary: '#cbd5e1',
								colorDanger: '#f87171',
								borderRadius: '10px',
								fontFamily: 'inherit',
						  }
						: {
								colorPrimary: '#2563eb',
								colorBackground: '#ffffff',
								colorText: '#0f172a',
								colorTextSecondary: '#475569',
								colorDanger: '#dc2626',
								borderRadius: '10px',
								fontFamily: 'inherit',
						  },
					rules: isDark
						? {
								'.Input': {
									border: '1px solid #334155',
									boxShadow: 'none',
								},
								'.Input:focus': {
									border: '1px solid #60a5fa',
									boxShadow: '0 0 0 1px #60a5fa',
								},
								'.Tab, .AccordionItem': {
									border: '1px solid #334155',
									boxShadow: 'none',
								},
						  }
						: {
								'.Input, .Tab, .AccordionItem': {
									border: '1px solid #e2e8f0',
									boxShadow: 'none',
								},
						  },
				},
			}}
		>
			{children}
		</Elements>
	);
}
