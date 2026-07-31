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

const FAILURE_REASONS = [
	['CUSTOMER_UNAVAILABLE', 'Customer unavailable'],
	['ADDRESS_NOT_FOUND', 'Address not found'],
	['RECIPIENT_REFUSED', 'Recipient refused delivery'],
	['ACCESS_RESTRICTED', 'Delivery access restricted'],
	['WEATHER_OR_SAFETY', 'Weather or safety issue'],
	['OTHER', 'Other'],
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
	const [reasonCode, setReasonCode] = useState('CUSTOMER_UNAVAILABLE');
	const [message, setMessage] = useState('');
	const queryClient = useQueryClient();

	useEffect(() => setCurrentStatus(status), [status]);

	const allowed = getAllowedShipmentTransitions({
		current: currentStatus,
		actorRole: FulfillmentActorRole.ADMIN,
		mode,
	});
	const mutation = useMutation({
		mutationFn: ({
			nextStatus,
			reason,
			note,
		}: {
			nextStatus: ShipmentStatus;
			reason?: string;
			note?: string;
		}) =>
			updateShipmentStatus({
				groupId,
				nextStatus,
				reasonCode: reason,
				message: note,
				idempotencyKey: crypto.randomUUID(),
			}),
		onSuccess: (nextStatus) => {
			setCurrentStatus(nextStatus);
			setFailureOpen(false);
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
		mutation.mutate({ nextStatus });
	};

	return (
		<>
			{allowed.length === 0 ? (
				<ShipmentStatusTag status={currentStatus} />
			) : (
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
						<DropdownMenuLabel>Next logistics step</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{allowed.map((nextStatus) => (
							<DropdownMenuItem
								key={nextStatus}
								disabled={
									mutation.isPending ||
									(currentStatus === ShipmentStatus.AWAITING_RECEIPT &&
										packageStatus !== PackageStatus.HANDED_OFF)
								}
								onSelect={() => chooseStatus(nextStatus)}
							>
								<ShipmentStatusTag status={nextStatus} />
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}

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
