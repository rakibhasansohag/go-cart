'use client';

import PackageStatusTag from '@/components/shared/package-status';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	getAllowedPackageTransitions,
	PACKAGE_STATUS_LABELS,
} from '@/lib/orders/fulfillment-state-machine';
import { queryKeys } from '@/lib/query-keys';
import { updatePackageStatus } from '@/queries/fulfillment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FulfillmentActorRole, PackageStatus } from '@prisma/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
	storeId: string;
	groupId: string;
	orderId: string;
	status: PackageStatus;
	storeUrl?: string;
	contentAlign?: 'start' | 'end';
}

export default function PackageStatusSelect({
	storeId,
	groupId,
	orderId,
	status,
	storeUrl,
	contentAlign = 'end',
}: Props) {
	const [currentStatus, setCurrentStatus] = useState(status);
	const queryClient = useQueryClient();

	useEffect(() => setCurrentStatus(status), [status]);

	const allowed = getAllowedPackageTransitions(
		currentStatus,
		FulfillmentActorRole.SELLER,
	);
	const mutation = useMutation({
		mutationFn: (nextStatus: PackageStatus) =>
			updatePackageStatus({
				storeId,
				groupId,
				nextStatus,
				idempotencyKey: crypto.randomUUID(),
			}),
		onSuccess: (nextStatus) => {
			setCurrentStatus(nextStatus);
			toast.success(`Package is now ${PACKAGE_STATUS_LABELS[nextStatus]}.`);
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: storeUrl
						? queryKeys.dashboard.orders(storeUrl)
						: queryKeys.dashboard.orderLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.orders.detail(orderId),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.profile.orderLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.dashboard.adminOrders(),
				}),
			]);
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	if (allowed.length === 0) return <PackageStatusTag status={currentStatus} />;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type='button'
					disabled={mutation.isPending}
					aria-label={`Change package status. Current status: ${PACKAGE_STATUS_LABELS[currentStatus]}`}
					title={
						mutation.isPending
							? 'Updating package status…'
							: `Change package status from ${PACKAGE_STATUS_LABELS[currentStatus]}`
					}
					className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60'
				>
					<PackageStatusTag status={currentStatus} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={contentAlign}
				sideOffset={6}
				className='z-[100000] w-56'
			>
				<DropdownMenuLabel>Next preparation step</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{allowed.map((nextStatus) => (
					<DropdownMenuItem
						key={nextStatus}
						disabled={mutation.isPending}
						onSelect={() => mutation.mutate(nextStatus)}
					>
						<PackageStatusTag status={nextStatus} />
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
