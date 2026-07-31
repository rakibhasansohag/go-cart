'use client';
import OrderStatusTag from '@/components/shared/order-status';
import PaymentStatusTag from '@/components/shared/payment-status';
import {
	OrderStatus,
	OrderTableDateFilter,
	OrderTableFilter,
	PaymentStatus,
	UserOrderType,
} from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, Suspense, Dispatch, SetStateAction } from 'react';
import Pagination from '../../shared/pagination';

import { Skeleton } from '@/components/ui/skeleton';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import OrderTableHeader from './order-table-header';
import { formatOrderId } from '@/lib/utils';

export function OrdersTableSkeleton() {
	return (
		<div className='overflow-hidden mt-5'>
			<div className='bg-background px-6 pt-5 pb-6 rounded-xl'>
				<div className='max-h-[700px] overflow-x-auto overflow-y-auto border rounded-md'>
					<table className='w-full min-w-max table-auto text-left'>
						<thead>
							<tr>
								<th className='border-y p-4 text-sm font-semibold'>Order</th>
								<th className='border-y p-4 text-sm font-semibold'>Products</th>
								<th className='border-y p-4 text-sm font-semibold'>Items</th>
								<th className='border-y p-4 text-sm font-semibold'>Payment</th>
								<th className='border-y p-4 text-sm font-semibold'>Delivery</th>
								<th className='border-y p-4 text-sm font-semibold'>Total</th>
								<th className='border-y p-4'></th>
							</tr>
						</thead>
						<tbody>
							{Array.from({ length: 5 }).map((_, i) => (
								<tr key={i} className='border-b'>
									<td className='p-4'>
										<div className='flex flex-col gap-2'>
											<Skeleton className='h-4 w-20' />
											<Skeleton className='h-3 w-32' />
										</div>
									</td>
									<td className='p-4'>
										<div className='flex gap-1'>
											<Skeleton className='h-7 w-7 rounded-full' />
											<Skeleton className='h-7 w-7 rounded-full -translate-x-2' />
										</div>
									</td>
									<td className='p-4'>
										<Skeleton className='h-4 w-16' />
									</td>
									<td className='p-4'>
										<Skeleton className='h-6 w-20 rounded-full mx-auto' />
									</td>
									<td className='p-4'>
										<Skeleton className='h-6 w-20 rounded-full' />
									</td>
									<td className='p-4'>
										<Skeleton className='h-4 w-16' />
									</td>
									<td className='p-4'>
										<Skeleton className='h-4 w-8' />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default function OrdersTable({
	prev_filter,
}: {
	orders?: UserOrderType[];
	totalPages?: number;
	prev_filter?: OrderTableFilter;
}) {
	// Pagination
	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	// Filter
	const [filter, setFilter] = useState<OrderTableFilter>(prev_filter || '');

	// Date period filter
	const [period, setPeriod] = useState<OrderTableDateFilter>('');

	// Search filter
	const [search, setSearch] = useState<string>('');

	useEffect(() => {
		// Reset to page 1 when filters, search or page size changes
		setPage(1);
	}, [filter, period, search, pageSize]);

	return (
		<div>
			<div className=''>
				{/* Header */}
				<OrderTableHeader
					filter={filter}
					setFilter={setFilter}
					period={period}
					setPeriod={setPeriod}
					search={search}
					setSearch={setSearch}
				/>
				{/* Table wrapped in Suspense */}
				<Suspense fallback={<OrdersTableSkeleton />}>
					<OrdersTableContent
						filter={filter}
						period={period}
						search={search}
						page={page}
						setPage={setPage}
						pageSize={pageSize}
						setPageSize={setPageSize}
					/>
				</Suspense>
			</div>
		</div>
	);
}

function OrdersTableContent({
	filter,
	period,
	search,
	page,
	setPage,
	pageSize,
	setPageSize,
}: {
	filter: OrderTableFilter;
	period: OrderTableDateFilter;
	search: string;
	page: number;
	setPage: Dispatch<SetStateAction<number>>;
	pageSize: number;
	setPageSize: Dispatch<SetStateAction<number>>;
}) {
	const { data: res } = useSuspenseQuery({
		queryKey: queryKeys.profile.orders({ filter, period, search, page, pageSize }),
		queryFn: async () => {
			const res = await fetch(`/api/profile/orders?filter=${filter}&period=${period}&search=${search}&page=${page}&pageSize=${pageSize}`);
			if (!res.ok) throw new Error('Failed to fetch orders');
			return res.json() as Promise<{
				orders: UserOrderType[];
				totalPages: number;
				currentPage: number;
				pageSize: number;
				totalCount: number;
			}>;
		},
	});

	const data = res.orders;
	const totalDataPages = res.totalPages;

	return (
		<>
			<div className='overflow-hidden mt-5'>
				<div className='bg-background px-4 sm:px-6 pt-5 pb-6 rounded-xl shadow-sm border border-border/10'>
					{/* Scrollable Table Container */}
					<div className='max-h-[700px] overflow-x-auto overflow-y-auto scrollbar border rounded-md '>
						<table className='w-full min-w-max table-auto text-left'>
							<thead>
								<tr>
									<th className='cursor-pointer text-sm border-y p-4'>
										Order
									</th>
									<th className='cursor-pointer text-sm border-y p-4'>
										Products
									</th>
									<th className='cursor-pointer text-sm border-y p-4'>
										Items
									</th>
									<th className='cursor-pointer text-sm border-y p-4'>
										Payment
									</th>
									<th className='cursor-pointer text-sm border-y p-4'>
										Delivery
									</th>
									<th className='cursor-pointer text-sm border-y p-4'>
										Total
									</th>
									<th className='cursor-pointer text-sm border-y p-4'></th>
								</tr>
							</thead>
							<tbody>
								{data.map((order) => {
									const totalItemsCount = order.groups.reduce(
										(total, group) => total + group._count.items,
										0,
									);
									const images = Array.from(
										order.groups.flatMap((g) => g.items.map((p) => p.image)),
									);
									return (
										<tr key={order.id} className='border-b'>
											<td className='p-4'>
												<div className='flex items-center gap-3'>
													<div className='flex flex-col'>
														<p className='block antialiased font-sans text-sm leading-normal font-normal'>
															{formatOrderId(order.id)}
														</p>
														<p className='block antialiased font-sans text-sm leading-normal font-normal'>
															Placed on: {new Date(order.createdAt).toDateString()}
														</p>
													</div>
												</div>
											</td>
											<td>
												<div className='flex'>
													{images.slice(0, 5).map((img, i) => (
														<Image
															key={img}
															src={img}
															alt=''
															width={50}
															height={50}
															className='w-7 h-7 object-cover shadow-sm rounded-full'
															style={{ transform: `translateX(-${i * 8}px)` }}
														/>
													))}
												</div>
											</td>
											<td className='p-4'>{totalItemsCount} items</td>
											<td className='p-4 text-center'>
												<PaymentStatusTag
													status={order.paymentStatus as PaymentStatus}
													isTable
												/>
											</td>
											<td className='p-4 '>
												<OrderStatusTag
													status={order.orderStatus as OrderStatus}
												/>
											</td>
											<td className='p-4'>${order.total.toFixed(2)}</td>
											<td className='p-4'>
												<Link href={`/order/${order.id}`}>
													<span className='text-xs text-blue-primary cursor-pointer hover:underline'>
														View
													</span>
												</Link>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>
			<Pagination
				page={page}
				setPage={setPage}
				totalPages={totalDataPages}
				pageSize={pageSize}
				setPageSize={setPageSize}
			/>
		</>
	);
}
