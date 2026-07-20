/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import StoreStatusTag from '@/components/shared/store-status';
import { AdminStoreType, StoreStatus } from '@/lib/types';
import { updateStoreStatus } from '@/queries/store';
import { FC, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	storeId: string;
	status: StoreStatus;
}

const StoreStatusSelect: FC<Props> = ({ status, storeId }) => {
	const [newStatus, setNewStatus] = useState<StoreStatus>(status);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const queryClient = useQueryClient();

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: StoreStatus) => updateStoreStatus(storeId, selectedStatus),
		onMutate: async (selectedStatus) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.dashboard.stores() });
			const previousStores = queryClient.getQueryData<AdminStoreType[]>(queryKeys.dashboard.stores());

			if (previousStores) {
				queryClient.setQueryData<AdminStoreType[]>(
					queryKeys.dashboard.stores(),
					previousStores.map((store) =>
						store.id === storeId ? { ...store, status: selectedStatus } : store
					)
				);
			}

			setNewStatus(selectedStatus);
			setIsOpen(false);
			return { previousStores };
		},
		onError: (err, selectedStatus, context) => {
			if (context?.previousStores) {
				queryClient.setQueryData(queryKeys.dashboard.stores(), context.previousStores);
				setNewStatus(status);
			}
			toast.error(err.toString());
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stores() });
		},
	});

	// Options
	const options = Object.values(StoreStatus).filter((s) => s !== newStatus);

	// Handle click
	const handleClick = (selectedStatus: StoreStatus) => {
		statusMutation.mutate(selectedStatus);
	};

	return (
		<div className='relative'>
			{/* Current status */}
			<div
				className='cursor-pointer'
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<StoreStatusTag status={newStatus} />
			</div>
			{/* Dropdown */}
			{isOpen && (
				<div className='absolute z-50 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-md shadow-md mt-2 w-[140px]'>
					{options.map((option) => (
						<button
							key={option}
							disabled={statusMutation.isPending}
							className='w-full flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md'
							onClick={() => handleClick(option)}
						>
							<StoreStatusTag status={option} />
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default StoreStatusSelect;
