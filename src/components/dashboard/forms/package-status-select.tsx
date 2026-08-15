'use client';

import PackageStatusTag from '@/components/shared/package-status';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	getAllowedPackageTransitions,
	PACKAGE_PREPARATION_STEPS,
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
}

export default function PackageStatusSelect({
	storeId,
	groupId,
	orderId,
	status,
	storeUrl,
}: Props) {
	const [currentStatus, setCurrentStatus] = useState(status);
	const [confirmStatus, setConfirmStatus] = useState<PackageStatus | null>(
		null,
	);
	const [selectedStatus, setSelectedStatus] = useState('');
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
			toast.success(
				`Package is now ${PACKAGE_STATUS_LABELS[nextStatus]}.`,
			);
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
	const isTerminal =
		currentStatus === PackageStatus.HANDED_OFF ||
		currentStatus === PackageStatus.CANCELLED;

	const selectStatus = (nextStatus: PackageStatus) => {
		setSelectedStatus('');
		if (allowed[0] === nextStatus) {
			mutation.mutate(nextStatus);
			return;
		}
		setConfirmStatus(nextStatus);
	};

	if (isTerminal) {
		return (
			<span
				title="Preparation is complete and cannot be changed"
				aria-label={`Package preparation complete: ${PACKAGE_STATUS_LABELS[currentStatus]}`}
			>
				<PackageStatusTag status={currentStatus} />
			</span>
		);
	}

	return (
		<>
			<Select
				aria-label={`Change package status. Current status: ${PACKAGE_STATUS_LABELS[currentStatus]}`}
				value={selectedStatus}
				disabled={mutation.isPending}
				onValueChange={(value) => selectStatus(value as PackageStatus)}
			>
				<SelectTrigger size='sm' className='w-[136px] text-xs'>
					<SelectValue placeholder={PACKAGE_STATUS_LABELS[currentStatus]} />
				</SelectTrigger>
				<SelectContent>
					{PACKAGE_PREPARATION_STEPS.map((nextStatus) => (
						<SelectItem
							key={nextStatus}
							value={nextStatus}
							disabled={nextStatus === currentStatus || !allowed.includes(nextStatus)}
						>
							{PACKAGE_STATUS_LABELS[nextStatus]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Dialog
				open={confirmStatus !== null}
				onOpenChange={(open) => !open && setConfirmStatus(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Skip preparation steps?</DialogTitle>
						<DialogDescription>
							This moves the package from{' '}
							<strong>
								{PACKAGE_STATUS_LABELS[currentStatus]}
							</strong>{' '}
							to{' '}
							<strong>
								{confirmStatus
									? PACKAGE_STATUS_LABELS[confirmStatus]
									: ''}
							</strong>
							, skipping the intermediate preparation steps. This
							cannot be reversed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setConfirmStatus(null)}
						>
							Keep current status
						</Button>
						<Button
							disabled={mutation.isPending || !confirmStatus}
							onClick={() => {
								if (confirmStatus)
									mutation.mutate(confirmStatus);
								setConfirmStatus(null);
							}}
						>
							Confirm update
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
