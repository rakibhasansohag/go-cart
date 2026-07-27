'use client';
import { capturePayPalPayment, createPayPalPayment } from '@/queries/paypal';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { toast } from 'sonner';

export default function PaypalPayment({ orderId }: { orderId: string }) {
	const router = useRouter();
	const paymentIdRef = useRef('');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createOrder = async (data: any, actions: any) => {
		try {
			const response = await createPayPalPayment(orderId);
			paymentIdRef.current = response.id;
			return response.id;
		} catch (err: any) {
			toast.error(err.message || 'Failed to initialize PayPal payment.');
			throw err;
		}
	};

	const onApprove = async () => {
		try {
			const captureResponse = await capturePayPalPayment(
				orderId,
				paymentIdRef.current,
			);
			if (captureResponse.id) {
				toast.success('Payment completed successfully!');
				router.refresh();
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to capture PayPal payment.');
		}
	};

	return (
		<div>
			<PayPalButtons
				createOrder={createOrder}
				onApprove={onApprove}
				onError={(err) => {
					toast.error('PayPal transaction encountered an error. Please try again.');
				}}
			/>
		</div>
	);
}
