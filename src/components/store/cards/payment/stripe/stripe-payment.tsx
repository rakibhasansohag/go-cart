'use client';
import { Button } from '@/components/store/ui/button';
import { useRouter } from 'next/navigation';
import {
	useStripe,
	useElements,
	PaymentElement,
} from '@stripe/react-stripe-js';
import { FormEvent, useEffect, useState } from 'react';
import {
	createStripePayment,
	createStripePaymentIntent,
} from '@/queries/stripe';
import { toast } from 'sonner';

export default function StripePayment({ orderId }: { orderId: string }) {
	const router = useRouter();
	const stripe = useStripe();
	const elements = useElements();
	const [errorMessage, setErrorMessage] = useState<string>();
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		getClientSecret();
	}, [orderId]);

	const getClientSecret = async () => {
		try {
			const res = await createStripePaymentIntent(orderId);
			if (res.clientSecret) setClientSecret(res.clientSecret);
			if (res.userId) setUserId(res.userId);
		} catch (err: any) {
			setErrorMessage(err.message || 'Failed to initialize payment.');
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);

		if (!stripe || !elements || !userId) {
			setErrorMessage('Payment not initialized. User session missing.');
			setLoading(false);
			return;
		}

		const { error: submitError } = await elements.submit();
		if (submitError) {
			setErrorMessage(submitError.message);
			setLoading(false);
			return;
		}

		if (clientSecret) {
			const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
			const { error, paymentIntent } = await stripe.confirmPayment({
				elements,
				clientSecret,
				confirmParams: {
					return_url: origin,
				},
				redirect: 'if_required',
			});

			if (!error && paymentIntent) {
				try {
					const res = await createStripePayment(orderId, paymentIntent, userId);
					if (!res.paymentDetails?.paymentInetntId) throw new Error('Payment confirmation failed.');
					toast.success('Payment completed successfully!');
					router.refresh();
				} catch (error: any) {
					const msg = error.message || error.toString();
					setErrorMessage(msg);
					toast.error(msg);
				}
			} else if (error) {
				const msg = error.message || 'Payment processing error.';
				setErrorMessage(msg);
				toast.error(msg);
			}
		}
		setLoading(false);
	};

	if (!clientSecret || !stripe || !elements) {
		return (
			<div className='flex items-center justify-center p-6'>
				<div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite]'>
					<span className='!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]'>
						Loading...
					</span>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className='bg-card p-4 rounded-xl border border-border/60 space-y-3'>
			{clientSecret && <PaymentElement />}
			{errorMessage && (
				<div className='text-xs font-semibold text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20'>
					{errorMessage}
				</div>
			)}
			<Button
				variant='black'
				disabled={!stripe || loading}
				className='w-full h-11 text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer'
			>
				{loading ? 'Processing Payment...' : 'Pay Now'}
			</Button>
		</form>
	);
}
