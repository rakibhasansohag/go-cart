'use client';
import { capturePayPalPayment, createPayPalPayment } from '@/queries/paypal';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export default function PaypalPayment({ orderId }: { orderId: string }) {
	const router = useRouter();
	const paymentIdRef = useRef('');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createOrder = async (data: any, actions: any) => {
		const response = await createPayPalPayment(orderId);
		paymentIdRef.current = response.id;

		return response.id;
	};

	const onApprove = async () => {
		const captureResponse = await capturePayPalPayment(
			orderId,
			paymentIdRef.current,
		);
		if (captureResponse.id) router.refresh();
	};
	return (
		<div>
			<PayPalButtons
				createOrder={createOrder}
				onApprove={onApprove}
				onError={(err) => {}}
			/>
		</div>
	);
}
