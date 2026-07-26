'use client';

import { PaymentDetails } from '@prisma/client';
import { Package, Truck, CreditCard, Hash, Calendar, ShieldCheck, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function OrderInfoCard({
	totalItemsCount,
	deliveredItemsCount,
	paymentDetails,
	paymentStatus,
}: {
	totalItemsCount: number;
	deliveredItemsCount: number;
	paymentDetails: PaymentDetails | null;
	paymentStatus?: string;
}) {
	const [copiedRef, setCopiedRef] = useState(false);

	const isPaid =
		paymentDetails?.status === 'Completed' ||
		paymentDetails?.status === 'Paid' ||
		paymentStatus === 'Paid' ||
		paymentStatus === 'Completed';

	const statusLabel = paymentDetails?.status || (isPaid ? 'Paid' : 'Unpaid');
	const methodLabel = paymentDetails?.paymentMethod || (isPaid ? 'Online Payment' : '-');
	const refId = paymentDetails?.paymentInetntId || '-';
	const paidAtLabel =
		paymentDetails?.updatedAt
			? new Date(paymentDetails.updatedAt).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
			  })
			: '-';

	const handleCopyRef = () => {
		if (!refId || refId === '-') return;
		navigator.clipboard.writeText(refId);
		setCopiedRef(true);
		toast.success('Payment reference copied');
		setTimeout(() => setCopiedRef(false), 2000);
	};

	return (
		<div className='w-full bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-all'>
			<div className='flex items-center gap-2 mb-4 pb-3 border-b border-border/40'>
				<ShieldCheck className='w-4 h-4 text-primary' />
				<h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
					Order Information
				</h3>
			</div>

			<div className='space-y-3 text-xs'>
				<div className='flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30'>
					<span className='flex items-center gap-2 text-muted-foreground font-medium'>
						<Package className='w-3.5 h-3.5 text-primary' />
						Total Items
					</span>
					<span className='font-bold text-foreground bg-background px-2.5 py-0.5 rounded-lg border border-border/40'>
						{totalItemsCount}
					</span>
				</div>

				<div className='flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30'>
					<span className='flex items-center gap-2 text-muted-foreground font-medium'>
						<Truck className='w-3.5 h-3.5 text-emerald-500' />
						Items Delivered
					</span>
					<span className='font-bold text-foreground bg-background px-2.5 py-0.5 rounded-lg border border-border/40'>
						{deliveredItemsCount} / {totalItemsCount}
					</span>
				</div>

				<div className='flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30'>
					<span className='flex items-center gap-2 text-muted-foreground font-medium'>
						<CreditCard className='w-3.5 h-3.5 text-primary' />
						Payment Status
					</span>
					<span
						className={`font-semibold px-2.5 py-1 rounded-lg text-[11px] border ${
							isPaid
								? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
								: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
						}`}
					>
						{statusLabel}
					</span>
				</div>

				<div className='flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30'>
					<span className='flex items-center gap-2 text-muted-foreground font-medium'>
						<CreditCard className='w-3.5 h-3.5 text-primary' />
						Payment Method
					</span>
					<span className='font-medium text-foreground capitalize'>{methodLabel}</span>
				</div>

				<div
					onClick={handleCopyRef}
					className={`flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30 ${
						refId !== '-' ? 'cursor-pointer hover:bg-muted/60 transition-all' : ''
					}`}
					title={refId !== '-' ? 'Click to copy Payment Ref' : undefined}
				>
					<span className='flex items-center gap-2 text-muted-foreground font-medium'>
						<Hash className='w-3.5 h-3.5 text-primary' />
						Payment Ref
					</span>
					<div className='flex items-center gap-1 font-mono text-[11px] text-foreground max-w-[140px] truncate'>
						<span className='truncate'>{refId}</span>
						{refId !== '-' && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleCopyRef();
								}}
								className='p-1 hover:bg-background rounded-md transition-all text-muted-foreground cursor-pointer'
								title='Copy Ref ID'
							>
								{copiedRef ? (
									<Check className='w-3 h-3 text-emerald-500' />
								) : (
									<Copy className='w-3 h-3' />
								)}
							</button>
						)}
					</div>
				</div>

				<div className='flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30'>
					<span className='flex items-center gap-2 text-muted-foreground font-medium'>
						<Calendar className='w-3.5 h-3.5 text-primary' />
						Paid At
					</span>
					<span className='font-medium text-foreground'>{paidAtLabel}</span>
				</div>
			</div>
		</div>
	);
}
