'use client';
import OrderStatusTag from '@/components/shared/order-status';
import PaymentStatusTag from '@/components/shared/payment-status';
import { Button } from '@/components/ui/button';
import { OrderFulltType, OrderStatus, PaymentStatus } from '@/lib/types';
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import React from 'react';
import { generateOrderPDFBlob } from './pdf-invoice';
import { downloadBlobAsFile, printPDF } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function OrderHeader({ order }: { order: OrderFulltType }) {
	const router = useRouter();

	if (!order) return;

	const handleGoBack = () => router.back();

	const handleDownload = async () => {
		try {
			const pdfBlob = await generateOrderPDFBlob(order);
			downloadBlobAsFile(pdfBlob, `Order_${order.id}.pdf`);
		} catch (error) {}
	};

	const handlePrint = async () => {
		try {
			const pdfBlob = await generateOrderPDFBlob(order);
			printPDF(pdfBlob);
		} catch (error) {}
	};

	return (
		<div>
			<div className='w-full border-b flex flex-col min-[1100px]:flex-row gap-4 p-2'>
				{/* Order id */}
				<div className='min-[1100px]:w-[920px] xl:w-[990px] flex items-center gap-x-3 '>
					<div className='border-r pr-4'>
						<button
							className='w-10 h-10 border rounded-full grid place-items-center cursor-pointer'
							onClick={handleGoBack}
						>
							<ChevronLeft className='stroke-main-secondary' />
						</button>
					</div>
					<h1 className='text-main-secondary'>Order Details</h1>
					<ChevronRight className='stroke-main-secondary w-4' />
					<h2>Order #{order.id}</h2>
				</div>
				<div className='w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 '>
					{/* Status */}
					<div className='w-full flex items-center gap-x-4'>
						<PaymentStatusTag status={order.paymentStatus as PaymentStatus} />
						<OrderStatusTag status={order.orderStatus as OrderStatus} />
					</div>
					{/* Actions */}
					<div className='flex items-center gap-x-4'>
						<Button variant='outline' onClick={() => handleDownload()}>
							<Download className='w-4 me-2' />
							Export
						</Button>
						<Button variant='outline' onClick={() => handlePrint()}>
							<Printer className='w-4 me-2' />
							Print
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
