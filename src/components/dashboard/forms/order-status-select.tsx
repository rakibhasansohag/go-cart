'use client';

import OrderStatusTag from '@/components/shared/order-status';
import { OrderStatus } from '@/lib/types';
import { updateOrderGroupStatus } from '@/queries/order';
import { FC, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
	storeId: string;
	groupId: string;
	status: OrderStatus;
	storeUrl?: string;
}

const OrderStatusSelect: FC<Props> = ({ groupId, status, storeId, storeUrl }) => {
	const [newStatus, setNewStatus] = useState<OrderStatus>(status);
	const queryClient = useQueryClient();

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: OrderStatus) =>
			updateOrderGroupStatus(storeId, groupId, selectedStatus),
		onSuccess: (response, selectedStatus) => {
			if (response) {
				setNewStatus(selectedStatus);
				toast.success(`Order status ${selectedStatus} has been updated.`);
				if (storeUrl) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.dashboard.orders(storeUrl),
					});
				}
			}
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	// Options
	const options = Object.values(OrderStatus).filter((s) => s !== newStatus);

	const handleClick = (selectedStatus: OrderStatus) => {
		statusMutation.mutate(selectedStatus);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className='cursor-pointer outline-none border-none p-0 bg-transparent flex items-center gap-1 rounded-lg transition-transform hover:scale-105 active:scale-95'>
					<OrderStatusTag status={newStatus} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className='w-40 p-1 space-y-1 z-50'>
				{options.map((option) => (
					<DropdownMenuItem
						key={option}
						disabled={statusMutation.isPending}
						onClick={() => handleClick(option)}
						className='cursor-pointer p-1 rounded-md flex items-center justify-start hover:bg-muted focus:bg-muted transition-colors'
					>
						<OrderStatusTag status={option} />
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default OrderStatusSelect;
