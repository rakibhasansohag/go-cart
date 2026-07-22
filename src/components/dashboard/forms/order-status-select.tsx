/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import OrderStatusTag from '@/components/shared/order-status';
import { OrderStatus } from '@/lib/types';
import { updateOrderGroupStatus } from '@/queries/order';
import { FC, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	storeId: string;
	groupId: string;
	status: OrderStatus;
	storeUrl?: string;
}

const OrderStatusSelect: FC<Props> = ({ groupId, status, storeId, storeUrl }) => {
	const [newStatus, setNewStatus] = useState<OrderStatus>(status);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const queryClient = useQueryClient();

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: OrderStatus) =>
			updateOrderGroupStatus(storeId, groupId, selectedStatus),
		onSuccess: (response, selectedStatus) => {
			if (response) {
				setNewStatus(selectedStatus);
				toast.success(`Order status ${selectedStatus} has been updated.`);
				setIsOpen(false);
				if (storeUrl) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.dashboard.orders(storeUrl),
					});
				}
			}
		},
		onError: (error: any) => {
			toast.error(error.toString());
		},
	});

	// Options
	const options = Object.values(OrderStatus).filter((s) => s !== newStatus);

	const handleClick = (selectedStatus: OrderStatus) => {
		statusMutation.mutate(selectedStatus);
	};

	return (
		<div className='relative'>
			{/* Current status */}
			<div
				className='cursor-pointer'
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<OrderStatusTag status={newStatus} />
			</div>
			{/* Dropdown */}
			{isOpen && (
				<div className='absolute z-50 bg-background border border-gray-200 dark:border-gray-700 rounded-md shadow-md mt-2 w-[140px]'>
					{options.map((option) => (
						<button
							key={option}
							disabled={statusMutation.isPending}
							className='w-full flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer'
							onClick={() => handleClick(option)}
						>
							<OrderStatusTag status={option} />
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default OrderStatusSelect;
