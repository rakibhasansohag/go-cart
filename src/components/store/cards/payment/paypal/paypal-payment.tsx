'use client';
import { capturePayPalPayment, createPayPalPayment } from '@/queries/paypal';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { invalidatePaymentQueries } from '@/lib/payments/query-sync';

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

export default function PaypalPayment({ orderId }: { orderId: string }) {
	const queryClient = useQueryClient();
	const paymentIdRef = useRef('');
	const createOrder = async () => {
		try {
			const response = await createPayPalPayment(orderId);
			paymentIdRef.current = response.id;
			return response.id;
		} catch (error: unknown) {
			toast.error(
				getErrorMessage(error, 'Failed to initialize PayPal payment.'),
			);
			throw error;
		}
	};

	const onApprove = async () => {
		try {
			const captureResponse = await capturePayPalPayment(
				orderId,
				paymentIdRef.current,
			);
			if (captureResponse?.id) {
				await invalidatePaymentQueries(queryClient, orderId);
				toast.success('PayPal confirmed your payment. Your order is ready!');
			} else {
				throw new Error(
					'PayPal is still processing this payment. The order will update automatically.',
				);
			}
		} catch (error: unknown) {
			toast.error(
				getErrorMessage(error, 'Failed to capture PayPal payment.'),
			);
		}
	};

	return (
		<div className='space-y-2'>
			<div>
				<p className='text-xs font-semibold text-foreground'>Pay with PayPal</p>
				<p className='mt-0.5 text-[11px] text-muted-foreground'>
					You will approve the payment with PayPal before GoCart confirms
					your order.
				</p>
			</div>
			<PayPalButtons
				createOrder={createOrder}
				onApprove={onApprove}
				onError={() => {
					toast.error('PayPal transaction encountered an error. Please try again.');
				}}
			/>
		</div>
	);
}
