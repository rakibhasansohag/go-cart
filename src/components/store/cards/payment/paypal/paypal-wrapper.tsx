import { ReactNode } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

export default function PaypalWrapper({ children }: { children: ReactNode }) {
	if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
		return (
			<div role='status' className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300'>
				PayPal sandbox payment is not configured for this environment.
			</div>
		);
	}

	return (
		<div>
			<PayPalScriptProvider
				options={{
					clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string,
					currency: 'USD',
				}}
			>
				{children}
			</PayPalScriptProvider>
		</div>
	);
}
