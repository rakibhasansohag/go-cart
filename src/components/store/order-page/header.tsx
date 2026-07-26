'use client';

import { useState } from 'react';
import OrderStatusTag from '@/components/shared/order-status';
import PaymentStatusTag from '@/components/shared/payment-status';
import { Button } from '@/components/ui/button';
import { OrderFulltType, OrderStatus, PaymentStatus } from '@/lib/types';
import { ChevronLeft, ChevronRight, Download, Printer, Copy, Check } from 'lucide-react';
import { generateOrderPDFBlob } from './pdf-invoice';
import { downloadBlobAsFile, printPDF, formatOrderId } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function OrderHeader({ order }: { order: OrderFulltType }) {
	const router = useRouter();
	const [copied, setCopied] = useState(false);

	if (!order) return null;

	const formattedId = formatOrderId(order.id);

	const handleGoBack = () => router.back();

	const handleCopyId = () => {
		navigator.clipboard.writeText(formattedId);
		setCopied(true);
		toast.success(`Order ID ${formattedId} copied to clipboard`);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleDownload = async () => {
		try {
			const pdfBlob = await generateOrderPDFBlob(order);
			downloadBlobAsFile(pdfBlob, `Order_${formattedId}.pdf`);
		} catch {
			toast.error('Failed to export PDF');
		}
	};

	const handlePrint = async () => {
		try {
			const pdfBlob = await generateOrderPDFBlob(order);
			printPDF(pdfBlob);
		} catch {
			toast.error('Failed to print invoice');
		}
	};

	return (
		<div className='w-full mb-6 bg-card/80 backdrop-blur-md rounded-2xl border border-border/60 p-4 shadow-sm'>
			<div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
				{/* Left: Breadcrumb & Order Title */}
				<div className='flex items-center flex-wrap gap-2.5'>
					<button
						className='w-9 h-9 border border-border/80 rounded-xl flex items-center justify-center bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer'
						onClick={handleGoBack}
						title='Go Back'
					>
						<ChevronLeft className='w-5 h-5' />
					</button>

					<span className='text-sm font-medium text-muted-foreground'>Order Details</span>
					<ChevronRight className='w-4 h-4 text-muted-foreground/60' />

					<div
						onClick={handleCopyId}
						className='flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border/40 cursor-pointer hover:bg-muted/80 transition-all'
						title='Click to copy Order ID'
					>
						<h1 className='text-sm font-bold text-foreground font-mono tracking-tight'>
							{formattedId}
						</h1>
						<button
							onClick={(e) => {
								e.stopPropagation();
								handleCopyId();
							}}
							className='p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer'
							title='Copy Order ID'
						>
							{copied ? (
								<Check className='w-3.5 h-3.5 text-emerald-500' />
							) : (
								<Copy className='w-3.5 h-3.5' />
							)}
						</button>
					</div>
				</div>

				{/* Right: Status Tags & Actions */}
				<div className='flex items-center justify-between lg:justify-end gap-3 flex-wrap'>
					<div className='flex items-center gap-2'>
						<PaymentStatusTag status={order.paymentStatus as PaymentStatus} />
						<OrderStatusTag status={order.orderStatus as OrderStatus} />
					</div>

					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={handleDownload}
							className='h-9 text-xs font-semibold rounded-xl border-border/80 gap-1.5 shadow-xs cursor-pointer'
						>
							<Download className='w-3.5 h-3.5' />
							Export
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={handlePrint}
							className='h-9 text-xs font-semibold rounded-xl border-border/80 gap-1.5 shadow-xs cursor-pointer'
						>
							<Printer className='w-3.5 h-3.5' />
							Print
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
