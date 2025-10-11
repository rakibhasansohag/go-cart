'use client';
import OrderStatusTag from '@/components/shared/order-status';
import { OrderGroupWithItemsType, OrderStatus } from '@/lib/types';
import Image from 'next/image';
import React from 'react';
import ProductRow from './product-row';
import { useMediaQuery } from 'react-responsive';
import ProductRowGrid from './product-row-grid';
import { cn } from '@/lib/utils';

export default function OrderGroupTable({
	group,
	deliveryInfo,
	check,
}: {
	group: OrderGroupWithItemsType;
	deliveryInfo: {
		shippingService: string;
		deliveryMinDate: string;
		deliveryMaxDate: string;
	};
	check: boolean;
}) {
	const { shippingService, deliveryMaxDate, deliveryMinDate } = deliveryInfo;
	const { coupon, couponId, subTotal, total, shippingFees } = group;
	let discountedAmount = 0;
	if (couponId && coupon) {
		discountedAmount = ((subTotal + shippingFees) * coupon.discount) / 100;
	}
	const isBigScreen = useMediaQuery({ query: '(min-width: 1400px)' });

	return (
		<div className='border border-gray-200 rounded-xl p-6 max-lg:mx-auto lg:max-w-full'>
			<div className='flex flex-col xl:flex-row xl:items-center justify-between px-6 border-b border-gray-200'>
				<div>
					<p className='font-semibold text-base leading-7 text-main-primary'>
						Order Id:
						<span className='text-blue-primary font-medium ms-2'>
							#{group.id}
						</span>
					</p>
					<div className='flex items-center gap-x-2 mt-4'>
						<Image
							src={group.store.logo}
							alt={group.store.name}
							width={100}
							height={100}
							className='w-10 h-10 rounded-full object-cover'
						/>
						<span className='text-main-secondary font-medium'>
							{group.store.name}
						</span>
						<div className='w-[1px] h-5 bg-border mx-2' />
						<p>{shippingService}</p>
						<div className='w-[1px] h-5 bg-border mx-2' />
					</div>
				</div>
				<div className='mt-4 xl:mt-10'>
					<OrderStatusTag status={group.status as OrderStatus} />
				</div>
			</div>
			<div className='w-full px-3 min-[400px]:px-6'>
				<div>
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
				<div className='flex items-center max-lg:mt-3 text-center'>
					<div className='flex flex-col p-2 pb-4'>
						<p className='font-medium text-sm whitespace-nowrap leading-6 text-main-primary'>
							Expected Delivery Time
						</p>
						<p className='font-medium text-base whitespace-nowrap leading-7 lg:mt-3 text-emerald-500'>
							{deliveryMinDate} - {deliveryMaxDate}
						</p>
					</div>
				</div>
			</div>
			{/* Group info */}
			<div
				className={cn(
					'w-full border-t border-gray-200 pt-6 flex flex-col 2xl:flex-row items-center justify-between',
					{
						'xl:flex-row': check,
					},
				)}
			>
				<div
					className={cn(
						'flex flex-col 2xl:flex-row items-center max-lg:border-b border-gray-200',
						{
							'lg:flex-row': check,
						},
					)}
				>
					<CancelOrderButton onClick={() => {}} />
					<p className='font-medium text-lg text-main-primary px-6 py-3 max-lg:text-center border-r-2 border-gray-400'>
						Subtotal:
						<span className='text-main-secondary ms-1'>
							${group.subTotal.toFixed(2)}
						</span>
					</p>
					<p className='font-medium text-lg text-main-primary px-6 py-3 max-lg:text-center border-r-2 border-gray-400'>
						Shipping Fees:
						<span className='text-main-secondary ms-1'>
							${group.shippingFees.toFixed(2)}
						</span>
					</p>
					{group.couponId && (
						<p className='font-medium text-lg text-main-primary pl-6 py-3 max-lg:text-center'>
							Coupon ({coupon?.code})
							<span className='text-main-secondary ms-1'>
								(-{coupon?.discount}%)
							</span>
							<span className='text-main-secondary ms-1'>
								(-${discountedAmount.toFixed(2)})
							</span>
						</p>
					)}
				</div>
				<div>
					<p className='font-semibold text-xl text-main-primary py-4'>
						Total price:
						<span className='text-blue-primary ms-1'>${total.toFixed(2)}</span>
					</p>
				</div>
			</div>
		</div>
	);
}

const CancelOrderButton = ({ onClick }: { onClick: () => void }) => {
	const baseColor = 'text-red-600 dark:text-red-400';
	const hoverColor = 'group-hover:text-red-700 dark:group-hover:text-red-300';
	const baseStroke = 'stroke-red-600 dark:stroke-red-400';
	const hoverStroke =
		'group-hover:stroke-red-700 dark:group-hover:stroke-red-300';
	const borderColor = 'border-red-300 dark:border-red-600'; // Slightly stronger border
	const hoverBackground = 'hover:bg-red-50 dark:hover:bg-red-900'; // Subtle background on hover

	return (
		<button
			className={`
                flex outline-0 py-3 px-4 sm:pr-6 sm:border ${borderColor} whitespace-nowrap 
                gap-2 items-center justify-center font-semibold group text-lg 
                bg-white dark:bg-gray-800 transition-all duration-300 cursor-pointer 
                rounded-lg shadow-sm
                ${baseColor} ${hoverColor} ${hoverBackground}
            `}
			onClick={onClick}
		>
			{/* Custom SVG icon for 'Cancel' (Cross Mark) */}
			<svg
				className={`${baseStroke} transition-all duration-300 ${hoverStroke}`}
				xmlns='http://www.w3.org/2000/svg'
				width={22}
				height={22}
				viewBox='0 0 24 24'
				fill='none'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<line x1='18' y1='6' x2='6' y2='18'></line>
				<line x1='6' y1='6' x2='18' y2='18'></line>
			</svg>
			Cancel Order
		</button>
	);
};
