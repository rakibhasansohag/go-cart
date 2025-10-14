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

export const columns: ColumnDef<StoreOrderType>[] = [
	{
		accessorKey: 'id',
		header: 'Order',
		cell: ({ row }) => {
			return <span>{row.original.id}</span>;
		},
	},
	{
		accessorKey: 'products',
		header: 'Products',
		cell: ({ row }) => {
			const images = row.original.items.map((product) => product.image);
			return (
				<div className='flex flex-wrap gap-1'>
					{images.map((img, i) => (
						<Image
							key={`${img}-${i}`}
							src={img}
							alt=''
							width={100}
							height={100}
							className='w-7 h-7 object-cover rounded-full'
							style={{ transform: `translateX(-${i * 15}px)` }}
						/>
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
			{/* unchanged content */}
			View
			<span className='w-7 h-7 rounded-full bg-background grid place-items-center transition-transform duration-300 transform group-hover:rotate-12 group-hover:translate-x-1'>
				<Expand className='w-5 stroke-black dark:stroke-white' />
			</span>
		</button>
	);
};

