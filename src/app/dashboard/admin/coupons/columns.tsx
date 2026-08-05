'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';

import { useModal } from '@/providers/modal-provider';
import { Edit, MoreHorizontal, Trash, Store as StoreIcon, Ticket, ShoppingBag } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { queryKeys } from '@/lib/query-keys';
import { AdminCouponType } from '@/lib/types';
import { getTimeUntil } from '@/lib/utils';
import CustomModal from '@/components/dashboard/shared/custom-modal';
import AdminCouponDetails from '@/components/dashboard/forms/admin-coupon-details';
import { deleteAdminCoupon, getCoupon } from '@/queries/coupon';
import { toast } from 'sonner';

export const columns: ColumnDef<AdminCouponType>[] = [
	{
		accessorKey: 'code',
		header: 'Coupon Code',
		cell: ({ row }) => {
			return (
				<div className='flex items-center gap-2 font-mono font-semibold text-sm'>
					<Badge variant='outline' className='bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-2.5'>
						<Ticket className='w-3.5 h-3.5' />
						{row.original.code}
					</Badge>
				</div>
			);
		},
	},
	{
		accessorKey: 'discount',
		header: 'Discount',
		cell: ({ row }) => {
			return (
				<Badge variant='secondary' className='font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'>
					{row.original.discount}% OFF
				</Badge>
			);
		},
	},
	{
		accessorKey: 'store',
		header: 'Store',
		cell: ({ row }) => {
			const store = row.original.store;
			if (!store) {
				return (
					<Badge variant='outline' className='bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold text-[11px]'>
						Global Platform
					</Badge>
				);
			}
			return (
				<Link
					href={`/dashboard/admin/stores`}
					className='flex items-center gap-1.5 text-xs font-medium hover:text-primary transition-colors'
				>
					<StoreIcon className='w-3.5 h-3.5 text-muted-foreground' />
					<span>{store.name}</span>
				</Link>
			);
		},
	},
	{
		id: 'usageCount',
		header: 'Times Used',
		cell: ({ row }) => {
			const count = row.original._count?.orders ?? 0;
			return (
				<div className='flex items-center gap-1.5 text-xs font-medium'>
					<ShoppingBag className='w-3.5 h-3.5 text-muted-foreground' />
					<span className='font-semibold text-foreground'>{count}</span>
					<span className='text-muted-foreground'>{count === 1 ? 'time' : 'times'}</span>
				</div>
			);
		},
	},
	{
		accessorKey: 'startDate',
		header: 'Starts',
		cell: ({ row }) => {
			return (
				<span className='text-xs text-muted-foreground whitespace-nowrap'>
					{new Date(row.original.startDate).toLocaleDateString()}
				</span>
			);
		},
	},
	{
		accessorKey: 'endDate',
		header: 'Ends',
		cell: ({ row }) => {
			return (
				<span className='text-xs text-muted-foreground whitespace-nowrap'>
					{new Date(row.original.endDate).toLocaleDateString()}
				</span>
			);
		},
	},
	{
		accessorKey: 'timeLeft',
		header: 'Status / Time Left',
		cell: ({ row }) => {
			const { days, hours } = getTimeUntil(row.original.endDate);
			const isExpired = days < 0 || (days === 0 && hours <= 0);

			if (isExpired) {
				return (
					<Badge variant='outline' className='text-xs bg-destructive/10 text-destructive border-destructive/20'>
						Expired
					</Badge>
				);
			}

			return (
				<span className='text-xs font-medium text-foreground whitespace-nowrap'>
					{days}d {hours}h left
				</span>
			);
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			return <CellActions coupon={row.original} />;
		},
	},
];

interface CellActionsProps {
	coupon: AdminCouponType;
}

const CellActions = ({ coupon }: CellActionsProps) => {
	const { setOpen } = useModal();
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		mutationFn: () => deleteAdminCoupon(coupon.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dashboard', 'adminCoupons'] });
			toast.success('Coupon deleted successfully.');
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error?.message || 'Failed to delete coupon.');
		},
	});

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' className='h-8 w-8 p-0 transition-transform duration-150 hover:scale-110 active:scale-95 hover:bg-accent'>
						<span className='sr-only'>Open menu</span>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem
						className='flex gap-2 cursor-pointer'
						onClick={async () => {
							setLoading(true);
							try {
								const res = await getCoupon(coupon.id);
								setOpen(
									<CustomModal heading='Edit Coupon Details' subheading='Update coupon code or dates'>
										<AdminCouponDetails data={res} />
									</CustomModal>
								);
							} catch {
								toast.error('Failed to fetch coupon details.');
							} finally {
								setLoading(false);
							}
						}}
					>
						<Edit size={15} />
						Edit Coupon
					</DropdownMenuItem>

					<DropdownMenuSeparator />
					<AlertDialogTrigger asChild>
						<DropdownMenuItem className='flex gap-2 text-destructive cursor-pointer' variant='destructive'>
							<Trash size={15} />
							Delete Coupon
						</DropdownMenuItem>
					</AlertDialogTrigger>
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolute sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the coupon <strong>{coupon.code}</strong>.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={loading || deleteMutation.isPending}
						className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						onClick={() => deleteMutation.mutate()}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
