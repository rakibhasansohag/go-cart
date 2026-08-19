'use client';

import StoreStatusTag from '@/components/shared/store-status';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { StoreStatus } from '@/lib/types';
import { updateStoreStatus } from '@/queries/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	storeId: string;
	status: StoreStatus;
}

const StoreStatusSelect = ({ status, storeId }: Props) => {
	const [newStatus, setNewStatus] = useState<StoreStatus>(status);
	const queryClient = useQueryClient();
	const router = useRouter();

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: StoreStatus) => updateStoreStatus(storeId, selectedStatus),
		onMutate: (selectedStatus) => setNewStatus(selectedStatus),
		onError: (error) => {
			setNewStatus(status);
			toast.error(error instanceof Error ? error.message : 'Unable to update store status.');
		},
		onSuccess: (_, selectedStatus) => {
			toast.success(`Store status changed to ${selectedStatus}.`);
			queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stores() });
			router.refresh();
		},
	});

	return <Select value={newStatus} onValueChange={(value) => statusMutation.mutate(value as StoreStatus)} disabled={statusMutation.isPending}>
		<SelectTrigger aria-label='Change store status' className='h-8 min-w-32 border-0 bg-transparent px-0 shadow-none hover:bg-muted focus-visible:ring-1'>
			<StoreStatusTag status={newStatus} />
		</SelectTrigger>
		<SelectContent>
			{Object.values(StoreStatus).map((option) => <SelectItem key={option} value={option}><StoreStatusTag status={option} /></SelectItem>)}
		</SelectContent>
	</Select>;
};

export default StoreStatusSelect;
