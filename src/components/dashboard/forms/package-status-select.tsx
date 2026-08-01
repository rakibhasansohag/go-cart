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
import { Check, LockKeyhole } from 'lucide-react';

const PACKAGE_STEPS = [
	PackageStatus.PENDING,
	PackageStatus.ACCEPTED,
	PackageStatus.PROCESSING,
	PackageStatus.READY_FOR_HANDOFF,
	PackageStatus.HANDED_OFF,
] as const;

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
	const [confirmStatus, setConfirmStatus] = useState<PackageStatus | null>(
		null,
	);
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

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type='button'
						disabled={mutation.isPending}
						aria-label={`Change package status. Current status: ${PACKAGE_STATUS_LABELS[currentStatus]}`}
						title={
							mutation.isPending
								? 'Updating package status…'
								: 'View preparation steps'
						}
						className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60'
					>
						<PackageStatusTag status={currentStatus} />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align={contentAlign}
					sideOffset={6}
					className='z-[100000] w-64'
				>
					<DropdownMenuLabel>Preparation steps</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{PACKAGE_STEPS.map((nextStatus) => {
						const isCurrent = nextStatus === currentStatus;
						const isAllowed = allowed.includes(nextStatus);
						const currentIndex = PACKAGE_STEPS.indexOf(
							currentStatus as (typeof PACKAGE_STEPS)[number],
						);
						const stepIndex = PACKAGE_STEPS.indexOf(nextStatus);
						return (
							<DropdownMenuItem
								key={nextStatus}
								disabled={mutation.isPending || isCurrent || !isAllowed}
								onSelect={() => setConfirmStatus(nextStatus)}
							>
								<span className='flex w-full items-center justify-between gap-2'>
									<span className='flex items-center gap-2'>
										{stepIndex < currentIndex ? (
											<Check
												className='size-3.5 text-emerald-600'
												aria-hidden='true'
											/>
										) : !isAllowed && !isCurrent ? (
											<LockKeyhole
												className='size-3.5 text-muted-foreground'
												aria-hidden='true'
											/>
										) : null}
										<PackageStatusTag status={nextStatus} />
									</span>
									{isCurrent && (
										<span className='text-[11px] text-muted-foreground'>
											Current
										</span>
									)}
								</span>
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
			<Dialog
				open={confirmStatus !== null}
				onOpenChange={(open) => !open && setConfirmStatus(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm preparation update</DialogTitle>
						<DialogDescription>
							Move this package from{' '}
							<strong>{PACKAGE_STATUS_LABELS[currentStatus]}</strong> to{' '}
							<strong>
								{confirmStatus ? PACKAGE_STATUS_LABELS[confirmStatus] : ''}
							</strong>
							? This step cannot be reversed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant='outline' onClick={() => setConfirmStatus(null)}>
							Keep current status
						</Button>
						<Button
							disabled={mutation.isPending || !confirmStatus}
							onClick={() => {
								if (confirmStatus) mutation.mutate(confirmStatus);
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
