'use client';
import { Button } from '@/components/store/ui/button';
import {
	useStripe,
	useElements,
	PaymentElement,
} from '@stripe/react-stripe-js';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
	createStripePaymentIntent,
	verifyStripePayment,
} from '@/queries/stripe';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { invalidatePaymentQueries } from '@/lib/payments/query-sync';

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

export default function StripePayment({ orderId }: { orderId: string }) {
	const queryClient = useQueryClient();
	const stripe = useStripe();
	const elements = useElements();
	const [errorMessage, setErrorMessage] = useState<string>();
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(false);

	const getClientSecret = useCallback(async () => {
		try {
			const res = await createStripePaymentIntent(orderId);
			if (res.clientSecret) setClientSecret(res.clientSecret);
		} catch (error: unknown) {
			setErrorMessage(
				getErrorMessage(error, 'Failed to initialize payment.'),
			);
		}
	}, [orderId]);

	useEffect(() => {
		void getClientSecret();
	}, [getClientSecret]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);

		if (!stripe || !elements) {
			setErrorMessage('Secure payment is still initializing. Please wait.');
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
					await verifyStripePayment(orderId);
					await invalidatePaymentQueries(queryClient, orderId);
					toast.success('Payment confirmed. Your order is ready!');
				} catch (error: unknown) {
					const msg = getErrorMessage(
						error,
						'Payment confirmation failed.',
					);
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
		<form
			onSubmit={handleSubmit}
			className='space-y-3 rounded-xl border border-border/60 bg-card p-4 text-card-foreground'
		>
			<div>
				<p className='text-xs font-semibold text-foreground'>Pay securely by card</p>
				<p className='mt-0.5 text-[11px] text-muted-foreground'>
					Your card details are handled by Stripe and never stored by GoCart.
				</p>
			</div>
			{clientSecret && <PaymentElement />}
			{errorMessage && (
				<div className='text-xs font-semibold text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20'>
					{errorMessage}
				</div>
			)}
			<Button
				disabled={!stripe || loading}
				className='h-11 w-full cursor-pointer rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
			>
				{loading ? 'Processing Payment...' : 'Pay Now'}
			</Button>
		</form>
	);
}
