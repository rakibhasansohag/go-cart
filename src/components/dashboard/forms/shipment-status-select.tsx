'use client';

import ShipmentStatusTag from '@/components/shared/shipment-status';
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
import { Label } from '@/components/ui/label';
import {
	getAllowedShipmentTransitions,
	SHIPMENT_STATUS_LABELS,
} from '@/lib/orders/fulfillment-state-machine';
import { queryKeys } from '@/lib/query-keys';
import { updateShipmentStatus } from '@/queries/fulfillment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	FulfillmentActorRole,
	FulfillmentMode,
	PackageStatus,
	ShipmentStatus,
} from '@prisma/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, LockKeyhole } from 'lucide-react';

const FAILURE_REASONS = [
	['CUSTOMER_UNAVAILABLE', 'Customer unavailable'],
	['ADDRESS_NOT_FOUND', 'Address not found'],
	['RECIPIENT_REFUSED', 'Recipient refused delivery'],
	['ACCESS_RESTRICTED', 'Delivery access restricted'],
	['WEATHER_OR_SAFETY', 'Weather or safety issue'],
	['OTHER', 'Other'],
] as const;

const SHIPMENT_STEPS = [
	ShipmentStatus.AWAITING_RECEIPT,
	ShipmentStatus.RECEIVED_AT_HUB,
	ShipmentStatus.READY_FOR_DISPATCH,
	ShipmentStatus.IN_TRANSIT,
	ShipmentStatus.OUT_FOR_DELIVERY,
	ShipmentStatus.DELIVERED,
	ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
	ShipmentStatus.READY_FOR_REDELIVERY,
	ShipmentStatus.RETURNED_TO_HUB,
	ShipmentStatus.RETURNED_TO_SELLER,
	ShipmentStatus.AWAITING_PICKUP,
	ShipmentStatus.PICKED_UP,
	ShipmentStatus.CANCELLED,
] as const;

interface Props {
	groupId: string;
	orderId: string;
	status: ShipmentStatus;
	mode: FulfillmentMode;
	packageStatus: PackageStatus;
}

export default function ShipmentStatusSelect({
	groupId,
	orderId,
	status,
	mode,
	packageStatus,
}: Props) {
	const [currentStatus, setCurrentStatus] = useState(status);
	const [failureOpen, setFailureOpen] = useState(false);
	const [confirmStatus, setConfirmStatus] = useState<ShipmentStatus | null>(
		null,
	);
	const [reasonCode, setReasonCode] = useState('CUSTOMER_UNAVAILABLE');
	const [message, setMessage] = useState('');
	const queryClient = useQueryClient();

	useEffect(() => setCurrentStatus(status), [status]);

	const allowed = getAllowedShipmentTransitions({
		current: currentStatus,
		actorRole: FulfillmentActorRole.ADMIN,
		mode,
		allowSkip: true,
	});
	const immediateNext = getAllowedShipmentTransitions({
		current: currentStatus,
		actorRole: FulfillmentActorRole.ADMIN,
		mode,
	});
	const mutation = useMutation({
		mutationFn: ({
			nextStatus,
			skipIntermediate,
			reason,
			note,
		}: {
			nextStatus: ShipmentStatus;
			skipIntermediate?: boolean;
			reason?: string;
			note?: string;
		}) =>
			updateShipmentStatus({
				groupId,
				nextStatus,
				skipIntermediate,
				reasonCode: reason,
				message: note,
				idempotencyKey: crypto.randomUUID(),
			}),
		onSuccess: (nextStatus) => {
			setCurrentStatus(nextStatus);
			setFailureOpen(false);
			setConfirmStatus(null);
			setMessage('');
			toast.success(`Shipment is now ${SHIPMENT_STATUS_LABELS[nextStatus]}.`);
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.dashboard.adminOrders(),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.dashboard.orderLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.orders.detail(orderId),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.orders.tracking(orderId),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.profile.orderLists(),
				}),
			]);
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	const chooseStatus = (nextStatus: ShipmentStatus) => {
		if (nextStatus === ShipmentStatus.DELIVERY_ATTEMPT_FAILED) {
			setFailureOpen(true);
			return;
		}
		if (immediateNext.includes(nextStatus)) {
			mutation.mutate({ nextStatus });
			return;
		}
		setConfirmStatus(nextStatus);
	};

	const terminalStatuses: ShipmentStatus[] = [
		ShipmentStatus.DELIVERED,
		ShipmentStatus.PICKED_UP,
		ShipmentStatus.RETURNED_TO_SELLER,
		ShipmentStatus.CANCELLED,
	];
	const isTerminal = terminalStatuses.includes(currentStatus);

	if (isTerminal) {
		return (
			<span
				title='Shipment is complete and cannot be changed'
				aria-label={`Shipment complete: ${SHIPMENT_STATUS_LABELS[currentStatus]}`}
			>
				<ShipmentStatusTag status={currentStatus} />
			</span>
		);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type='button'
						disabled={mutation.isPending}
						aria-label={`Change shipment status. Current status: ${SHIPMENT_STATUS_LABELS[currentStatus]}`}
						title={
							mutation.isPending
								? 'Updating shipment status…'
								: `Change shipment status from ${SHIPMENT_STATUS_LABELS[currentStatus]}`
						}
						className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60'
					>
						<ShipmentStatusTag status={currentStatus} />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align='end'
					sideOffset={6}
					className='z-[100000] w-60'
				>
					<DropdownMenuLabel>Logistics steps</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{SHIPMENT_STEPS.map((nextStatus) => {
						const isCurrent = nextStatus === currentStatus;
						const isAllowed = allowed.includes(nextStatus);
						const currentIndex = SHIPMENT_STEPS.indexOf(
							currentStatus as (typeof SHIPMENT_STEPS)[number],
						);
						const stepIndex = SHIPMENT_STEPS.indexOf(nextStatus);
						return (
							<DropdownMenuItem
								key={nextStatus}
								disabled={
									mutation.isPending ||
									isCurrent ||
									!isAllowed ||
									(currentStatus === ShipmentStatus.AWAITING_RECEIPT &&
										packageStatus !== PackageStatus.HANDED_OFF)
								}
								onSelect={() => chooseStatus(nextStatus)}
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
										<ShipmentStatusTag status={nextStatus} />
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
						<DialogTitle>Confirm shipment update</DialogTitle>
						<DialogDescription>
							Move this shipment from{' '}
							<strong>{SHIPMENT_STATUS_LABELS[currentStatus]}</strong> to{' '}
							<strong>
								{confirmStatus ? SHIPMENT_STATUS_LABELS[confirmStatus] : ''}
							</strong>
							? This skips one or more logistics steps and cannot be reversed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant='outline' onClick={() => setConfirmStatus(null)}>
							Keep current status
						</Button>
						<Button
							disabled={mutation.isPending || !confirmStatus}
							onClick={() => {
								if (confirmStatus)
									mutation.mutate({
										nextStatus: confirmStatus,
										skipIntermediate: true,
									});
							}}
						>
							Confirm update
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={failureOpen} onOpenChange={setFailureOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Record failed delivery attempt</DialogTitle>
						<DialogDescription>
							Choose a reason and add any useful delivery note. This is stored
							in the fulfillment audit history.
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 py-2'>
						<div className='space-y-2'>
							<Label htmlFor={`failure-reason-${groupId}`}>Reason</Label>
							<select
								id={`failure-reason-${groupId}`}
								value={reasonCode}
								onChange={(event) => setReasonCode(event.target.value)}
								className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							>
								{FAILURE_REASONS.map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor={`failure-message-${groupId}`}>
								Optional message
							</Label>
							<textarea
								id={`failure-message-${groupId}`}
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								maxLength={500}
								className='min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setFailureOpen(false)}>
							Cancel
						</Button>
						<Button
							variant='destructive'
							disabled={mutation.isPending}
							onClick={() =>
								mutation.mutate({
									nextStatus: ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
									reason: reasonCode,
									note: message,
								})
							}
						>
							Record attempt
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
