'use client';

import { useState } from 'react';
import OrderStatusTag from '@/components/shared/order-status';
import { OrderGroupWithItemsType, OrderStatus } from '@/lib/types';
import Image from 'next/image';
import React from 'react';
import ProductRow from './product-row';
import { useMediaQuery } from 'react-responsive';
import ProductRowGrid from './product-row-grid';
import { formatOrderId } from '@/lib/utils';
import { Copy, Check, Store, Truck, Calendar, Tag, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OrderGroupTable({
	group,
	deliveryInfo,
}: {
	group: OrderGroupWithItemsType;
	deliveryInfo: {
		shippingService: string;
		deliveryMinDate: string;
		deliveryMaxDate: string;
	};
	check: boolean;
}) {
	const [copiedGroupRef, setCopiedGroupRef] = useState(false);
	const { shippingService, deliveryMaxDate, deliveryMinDate } = deliveryInfo;
	const { coupon, couponId, subTotal, total, shippingFees } = group;

	const discountedAmount = Math.max(0, subTotal + shippingFees - total);
	const isBigScreen = useMediaQuery({ query: '(min-width: 1024px)' });

	const formattedGroupId = formatOrderId(group.id);

	const handleCopyGroupId = () => {
		navigator.clipboard.writeText(formattedGroupId);
		setCopiedGroupRef(true);
		toast.success(`Package ID ${formattedGroupId} copied`);
		setTimeout(() => setCopiedGroupRef(false), 2000);
	};

	return (
		<div className='w-full bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden'>
			{/* Group Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-3'>
				<div className='flex items-center flex-wrap gap-3'>
					<div
						onClick={handleCopyGroupId}
						className='flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/30 cursor-pointer hover:bg-muted/80 transition-all'
						title='Click to copy Package ID'
					>
						<Store className='w-3.5 h-3.5 text-primary' />
						<span className='text-xs font-bold text-foreground font-mono'>
							{formattedGroupId}
						</span>
						<button
							onClick={(e) => {
								e.stopPropagation();
								handleCopyGroupId();
							}}
							className='p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-all cursor-pointer'
							title='Copy Package ID'
						>
							{copiedGroupRef ? (
								<Check className='w-3 h-3 text-emerald-500' />
							) : (
								<Copy className='w-3 h-3' />
							)}
						</button>
					</div>

					<div className='flex items-center gap-2'>
						<Image
							src={group.store.logo || '/assets/images/placeholder.png'}
							alt={group.store.name}
							width={32}
							height={32}
							className='w-7 h-7 rounded-full object-cover ring-1 ring-border/50'
						/>
						<span className='text-xs font-semibold text-foreground'>
							{group.store.name}
						</span>
					</div>

					<div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border/20'>
						<Truck className='w-3 h-3 text-primary' />
						<span>{shippingService}</span>
					</div>
				</div>

				<div>
					<OrderStatusTag status={group.status as OrderStatus} />
				</div>
			</div>

			{/* Items list */}
			<div className='divide-y divide-border/30'>
				{group.items.map((product, index) =>
					isBigScreen ? (
						<ProductRowGrid
							key={product.id ?? `${group.id}-item-${index}`}
							product={product}
						/>
					) : (
						<ProductRow
							key={product.id ?? `${group.id}-item-${index}`}
							product={product}
						/>
					),
				)}
			</div>

			{/* Delivery Time Pill */}
			<div className='mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex flex-wrap items-center justify-between gap-2 text-xs'>
				<span className='flex items-center gap-2 font-medium text-muted-foreground'>
					<Calendar className='w-3.5 h-3.5 text-emerald-500' />
					Estimated Delivery Window
				</span>
				<span className='font-bold text-emerald-600 dark:text-emerald-400'>
					{deliveryMinDate} – {deliveryMaxDate}
				</span>
			</div>

			{/* Group Financial Summary Footer */}
			<div className='mt-4 pt-4 border-t border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs'>
				<div className='flex items-center gap-2 flex-wrap'>
					<CancelOrderButton onClick={() => toast.info('Contact seller to request cancellation')} />

					<div className='flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/30 border border-border/30 font-medium text-muted-foreground'>
						<span>Subtotal: <strong className='text-foreground'>${subTotal.toFixed(2)}</strong></span>
						<span>•</span>
						<span>Shipping: <strong className='text-foreground'>+${shippingFees.toFixed(2)}</strong></span>
					</div>

					{couponId && coupon && (
						<div className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'>
							<Tag className='w-3.5 h-3.5' />
							<span>Coupon ({coupon.code}) -{coupon.discount}% (-${discountedAmount.toFixed(2)})</span>
						</div>
					)}
				</div>

				<div className='text-right'>
					<span className='text-xs font-semibold text-muted-foreground mr-2'>Package Total:</span>
					<span className='text-sm font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20'>
						${total.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	);
}

const CancelOrderButton = ({ onClick }: { onClick: () => void }) => {
	return (
		<button
			className='flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10 dark:text-red-400 transition-all cursor-pointer'
			onClick={onClick}
		>
			<XCircle className='w-3.5 h-3.5' />
			Cancel Package
		</button>
	);
};
