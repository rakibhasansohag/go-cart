'use client';
import { Button } from '@/components/store/ui/button';
import {
	useStripe,
	useElements,
	PaymentElement,
} from '@stripe/react-stripe-js';
import { FormEvent, useState } from 'react';
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
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (loading) return;
		setLoading(true);
		setErrorMessage(undefined);

		if (!stripe || !elements) {
			setErrorMessage('Secure payment is still initializing. Please wait.');
			setLoading(false);
			return;
		}

		try {
            const { error: submitError } = await elements.submit();
            if (submitError) throw new Error(submitError.message || 'Please check your payment details.');
            const { clientSecret } = await createStripePaymentIntent(orderId);
            if (!clientSecret) throw new Error('Failed to initialize payment.');
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: { return_url: window.location.origin },
                redirect: 'if_required',
            });
            if (error) throw new Error(error.message || 'Payment processing error.');
            if (paymentIntent) {
                await verifyStripePayment(orderId);
                await invalidatePaymentQueries(queryClient, orderId);
                toast.success('Payment confirmed. Your order is ready!');
            }
        } catch (error: unknown) {
            const message = getErrorMessage(error, 'Payment processing failed.');
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
	};

	if (!stripe || !elements) {
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
				<p className='mt-0.5 text-xs text-muted-foreground'>
					Your card details are handled by Stripe and never stored by GoCart.
				</p>
			</div>
			<PaymentElement />
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
