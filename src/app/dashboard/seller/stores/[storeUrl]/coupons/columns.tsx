'use client';

// React, Next.js imports
import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

// UI components
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks and utilities
import { useModal } from '@/providers/modal-provider';

// Lucide icons
import { Edit, MoreHorizontal, Trash } from 'lucide-react';

// Tanstack React Query & Table
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { queryKeys } from '@/lib/query-keys';

// Types

import { Coupon } from '@prisma/client';
import { getTimeUntil } from '@/lib/utils';
import CustomModal from '@/components/dashboard/shared/custom-modal';
import CouponDetails from '@/components/dashboard/forms/coupon-details';
import { deleteCoupon, getCoupon } from '@/queries/coupon';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { History, Eye } from 'lucide-react';
import { getCouponRedemptions } from '@/queries/coupon';
import { useQuery } from '@tanstack/react-query';
import { PulseLoader } from 'react-spinners';

export type SellerCouponTableRow = Coupon & {
	usedCount?: number;
	status?: 'Active' | 'Expired' | 'Inactive';
};

export const columns: ColumnDef<SellerCouponTableRow>[] = [
	{
		accessorKey: 'code',
		header: 'Code',
		cell: ({ row }) => {
			return <span className='font-bold uppercase tracking-wider'>{row.original.code}</span>;
		},
	},
	{
		accessorKey: 'discount',
		header: 'Discount',
		cell: ({ row }) => {
			return <span className='font-semibold'>{row.original.discount}%</span>;
		},
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			const status = row.original.status || 'Active';
			const variants = {
				Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
				Expired: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
				Inactive: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
			};

			return (
				<Badge className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${variants[status]}`}>
					{status}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'usage',
		header: 'Usage (Paid)',
		cell: ({ row }) => {
			const used = row.original.usedCount ?? 0;
			const max = row.original.maxUses ?? 0;
			return (
				<span className='font-medium text-xs'>
					{used} / {max > 0 ? max : 'Unlimited'}
				</span>
			);
		},
	},
	{
		accessorKey: 'startDate',
		header: 'Starts',
		cell: ({ row }) => {
			return <span>{new Date(row.original.startDate).toDateString()}</span>;
		},
	},
	{
		accessorKey: 'endDate',
		header: 'Ends',
		cell: ({ row }) => {
			return <span>{new Date(row.original.endDate).toDateString()}</span>;
		},
	},
	{
		accessorKey: 'timeLeft',
		header: 'Time Left',
		cell: ({ row }) => {
			const { days, hours } = getTimeUntil(row.original.endDate);
			if (days < 0 || hours < 0) {
				return <span className='text-muted-foreground italic text-xs'>Ended</span>;
			}
			return (
				<span className='text-xs font-medium'>
					{days}d {hours}h
				</span>
			);
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const rowData = row.original;
			return <CellActions coupon={rowData} />;
		},
	},
];

// Coupon Redemptions Trace Modal
const CouponTraceModal = ({ couponId, code }: { couponId: string; code: string }) => {
	const { data: redemptions, isLoading } = useQuery({
		queryKey: ['couponRedemptions', couponId],
		queryFn: () => getCouponRedemptions(couponId),
	});

	return (
		<div className='p-4 space-y-4 max-w-2xl w-full'>
			<div className='border-b border-border pb-3'>
				<h2 className='text-lg font-bold flex items-center gap-2'>
					<History className='w-5 h-5 text-primary' />
					Redemption History — Code: <span className='text-primary uppercase'>{code}</span>
				</h2>
				<p className='text-xs text-muted-foreground mt-0.5'>
					Track customer checkouts and timestamps for successfully placed orders using this discount code.
				</p>
			</div>

			{isLoading ? (
				<div className='py-8 flex justify-center'>
					<PulseLoader size={8} color='#f97316' />
				</div>
			) : !redemptions || redemptions.length === 0 ? (
				<div className='py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl'>
					No successful checkouts recorded for this coupon code yet.
				</div>
			) : (
				<div className='max-h-[350px] overflow-y-auto space-y-2.5 pr-1'>
					{redemptions.map((item) => (
						<div
							key={item.id}
							className='p-3 bg-muted/30 rounded-xl border border-border/60 flex items-center justify-between gap-3 text-xs'
						>
							<div className='space-y-0.5'>
								<div className='font-bold text-foreground'>{item.customerName}</div>
								<div className='text-muted-foreground text-[11px]'>{item.customerEmail}</div>
							</div>
							<div className='text-right space-y-0.5 shrink-0'>
								<div className='font-semibold text-primary'>${item.total.toFixed(2)}</div>
								<div className='text-muted-foreground text-[10px]'>
									{new Date(item.createdAt).toLocaleString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

interface CellActionsProps {
	coupon: SellerCouponTableRow;
}

const CellActions: React.FC<CellActionsProps> = ({ coupon }) => {
	const { setOpen, setClose } = useModal();
	const queryClient = useQueryClient();

	const params = useParams<{ storeUrl: string }>();

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteCoupon(id, params.storeUrl),
		onSuccess: () => {
			toast.success('Coupon deleted successfully');
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.coupons(params.storeUrl),
			});
			setClose();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete coupon');
		},
	});

	if (!coupon || !coupon.id) return null;

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' className='h-8 w-8 p-0'>
						<span className='sr-only'>Open menu</span>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem
						className='flex gap-2'
						onClick={() => {
							setOpen(
								<CustomModal>
									<CouponTraceModal couponId={coupon.id} code={coupon.code} />
								</CustomModal>,
							);
						}}
					>
						<Eye size={15} />
						Trace Usage
					</DropdownMenuItem>
					<DropdownMenuItem
						className='flex gap-2'
						onClick={() => {
							setOpen(
								<CustomModal>
									<CouponDetails
										data={{ ...coupon }}
										storeUrl={params.storeUrl}
									/>
								</CustomModal>,
								async () => {
									return {
										rowData: await getCoupon(coupon?.id),
									};
								},
							);
						}}
					>
						<Edit size={15} />
						Edit Details
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<AlertDialogTrigger asChild>
						<DropdownMenuItem
							className='flex gap-2 !cursor-pointer text-destructive focus:text-destructive'
							onClick={() => {}}
						>
							<Trash size={15} /> Delete coupon
						</DropdownMenuItem>
					</AlertDialogTrigger>
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialogContent className='max-w-lg'>
				<AlertDialogHeader>
					<AlertDialogTitle className='text-left'>
						Are you absolutely sure?
					</AlertDialogTitle>
					<AlertDialogDescription className='text-left'>
						This action cannot be undone. This will permanently delete the
						coupon.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className='flex items-center'>
					<AlertDialogCancel className='mb-2'>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={deleteMutation.isPending}
						className='bg-destructive hover:bg-destructive mb-2 text-white'
						onClick={() => {
							deleteMutation.mutate(coupon.id);
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
