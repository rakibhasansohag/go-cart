'use client';

// React, Next.js imports
import Image from 'next/image';

// Tanstack React Table
import { ColumnDef } from '@tanstack/react-table';

// Types
import { OrderStatus, PaymentStatus, StoreOrderType } from '@/lib/types';
import PaymentStatusTag from '@/components/shared/payment-status';
import OrderStatusSelect from '@/components/dashboard/forms/order-status-select';
import { Expand } from 'lucide-react';
import { useModal } from '@/providers/modal-provider';
import CustomModal from '@/components/dashboard/shared/custom-modal';
import StoreOrderSummary from '@/components/dashboard/shared/store-order-summary';

import Link from 'next/link';

export const columns: ColumnDef<StoreOrderType>[] = [
	{
		accessorKey: 'id',
		header: 'Order',
		cell: ({ row }) => {
			return <span className='font-mono text-xs font-semibold'>#{row.original.id.slice(0, 8)}...</span>;
		},
	},
	{
		accessorKey: 'customer',
		header: 'Customer',
		cell: ({ row }) => {
			const address = row.original.order.shippingAddress;
			const fullName = `${address.firstName} ${address.lastName}`.trim() || 'Customer';
			const email = address.user?.email || '';
			return (
				<div className='flex flex-col min-w-0 max-w-[180px]'>
					<span className='font-semibold text-xs text-foreground truncate'>
						{fullName}
					</span>
					<span className='text-[11px] text-muted-foreground truncate' title={email}>
						{email}
					</span>
				</div>
			);
		},
	},
	{
		accessorKey: 'products',
		header: 'Products',
		cell: ({ row }) => {
			const items = row.original.items;
			return (
				<div className='flex flex-wrap gap-1 items-center'>
					{items.map((item, i) => (
						<Link
							key={`${item.id}-${i}`}
							href={`/product/${item.productSlug}/${item.variantSlug}`}
							target='_blank'
							rel='noopener noreferrer'
							title={`View ${item.name} in new tab`}
							className='hover:opacity-80 transition-opacity'
						>
							<Image
								src={item.image}
								alt={item.name}
								width={100}
								height={100}
								className='w-7 h-7 object-cover rounded-full border border-border shadow-2xs'
								style={{ transform: `translateX(-${i * 10}px)` }}
							/>
						</Link>
					))}
				</div>
			);
		},
	},
	{
		accessorKey: 'paymentStatus',
		header: 'Payment',
		cell: ({ row }) => {
			return (
				<div>
					<PaymentStatusTag
						status={row.original.order.paymentStatus as PaymentStatus}
						isTable
					/>
				</div>
			);
		},
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			return (
				<div>
					<OrderStatusSelect
						groupId={row.original.id}
						status={row.original.status as OrderStatus}
						storeId={row.original.storeId}
					/>
				</div>
			);
		},
	},
	{
		accessorKey: 'total',
		header: 'Total',
		cell: ({ row }) => {
			return <span>${row.original.total.toFixed(2)}</span>;
		},
	},
	{
		accessorKey: 'open',
		header: '',
		cell: ({ row }) => {
			return <ViewOrderButton group={row.original} />;
		},
	},
];

interface ViewOrderButtonProps {
	group: StoreOrderType;
}

const ViewOrderButton: React.FC<ViewOrderButtonProps> = ({ group }) => {
	const { setOpen } = useModal();

	return (
		<button
			className='
        relative z-10 px-4 py-2 rounded-full border-2
        bg-[#0A0D2D] text-gray-50 font-sans lg:font-semibold
        flex items-center justify-center gap-2 mx-auto text-lg
        overflow-hidden transition-transform duration-300 ease-out
        transform
        /* hover / focus */
        hover:scale-105 hover:shadow-2xl hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-main-primary/60
        group cursor-pointer
      '
			onClick={() => {
				setOpen(
					<CustomModal maxWidth='!max-w-3xl'>
						<StoreOrderSummary group={group} />
					</CustomModal>,
				);
			}}
		>
			View
			<span className='w-7 h-7 rounded-full bg-background grid place-items-center transition-transform duration-300 transform group-hover:rotate-12 group-hover:translate-x-1'>
				<Expand className='w-5 stroke-black dark:stroke-white' />
			</span>
		</button>
	);
};

