'use client';

import ProductStatusTag from '@/components/shared/product-status';
import { ProductStatus } from '@/lib/types';
import { updateOrderItemStatus } from '@/queries/order';
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
	orderItemId: string;
	status: ProductStatus;
	storeUrl?: string;
}

const ProductStatusSelect: FC<Props> = ({ orderItemId, status, storeId, storeUrl }) => {
	const [newStatus, setNewStatus] = useState<ProductStatus>(status);
	const queryClient = useQueryClient();

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: ProductStatus) =>
			updateOrderItemStatus(storeId, orderItemId, selectedStatus),
		onSuccess: (response, selectedStatus) => {
			if (response) {
				setNewStatus(selectedStatus);
				toast.success(`Product status ${selectedStatus} updated.`);
				queryClient.invalidateQueries({
					queryKey: storeUrl
						? queryKeys.dashboard.orders(storeUrl)
						: queryKeys.dashboard.orderLists(),
				});
			}
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	const options = Object.values(ProductStatus).filter((s) => s !== newStatus);

	const handleClick = (selectedStatus: ProductStatus) => {
		statusMutation.mutate(selectedStatus);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className='cursor-pointer outline-none border-none p-0 bg-transparent flex items-center gap-1 rounded-lg transition-transform hover:scale-105 active:scale-95'>
					<ProductStatusTag status={newStatus} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-48 p-1 max-h-56 overflow-y-auto space-y-1 z-50'>
				{options.map((option) => (
					<DropdownMenuItem
						key={option}
						disabled={statusMutation.isPending}
						onClick={() => handleClick(option)}
						className='cursor-pointer p-1 rounded-md flex items-center justify-start hover:bg-muted focus:bg-muted transition-colors'
					>
						<ProductStatusTag status={option} />
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ProductStatusSelect;
