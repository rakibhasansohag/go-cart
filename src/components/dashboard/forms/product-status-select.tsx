/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import ProductStatusTag from '@/components/shared/product-status';
import { ProductStatus } from '@/lib/types';
import { updateOrderItemStatus } from '@/queries/order';
import { FC, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	storeId: string;
	orderItemId: string;
	status: ProductStatus;
	storeUrl?: string;
}

const ProductStatusSelect: FC<Props> = ({ orderItemId, status, storeId, storeUrl }) => {
	const [newStatus, setNewStatus] = useState<ProductStatus>(status);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const queryClient = useQueryClient();

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: ProductStatus) =>
			updateOrderItemStatus(storeId, orderItemId, selectedStatus),
		onSuccess: (response, selectedStatus) => {
			if (response) {
				setNewStatus(selectedStatus);
				toast.success(`Product status ${selectedStatus} has been updated.`);
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
	const options = Object.values(ProductStatus).filter((s) => s !== newStatus);

	const handleClick = (selectedStatus: ProductStatus) => {
		statusMutation.mutate(selectedStatus);
	};

	return (
		<div className='relative'>
			{/* Current status */}
			<div
				className='cursor-pointer'
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<ProductStatusTag status={newStatus} />
			</div>
			{/* Dropdown */}
			{isOpen && (
				<div className='absolute z-50 bg-background border border-gray-200 dark:border-gray-700 rounded-md shadow-md mt-2 w-[170px]'>
					{options.map((option) => (
						<button
							key={option}
							disabled={statusMutation.isPending}
							className='w-full flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md'
							onClick={() => handleClick(option)}
						>
							<ProductStatusTag status={option} />
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default ProductStatusSelect;
