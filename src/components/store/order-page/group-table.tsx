'use client';

import { useState } from 'react';
import PackageStatusTag from '@/components/shared/package-status';
import ShipmentStatusTag from '@/components/shared/shipment-status';
import { OrderGroupWithItemsType } from '@/lib/types';
import Image from 'next/image';
import React from 'react';
import ProductRow from './product-row';
import { useMediaQuery } from 'react-responsive';
import ProductRowGrid from './product-row-grid';
import { formatPackageId } from '@/lib/utils';
import { Copy, Check, Store, Truck, Calendar, Tag, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { CancellationReasonCode, CancellationRequestStatus } from '@prisma/client';
import { canRequestCancellation } from '@/lib/orders/fulfillment-state-machine';
import { requestPackageCancellation } from '@/queries/fulfillment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function OrderGroupTable({
	group,
	deliveryInfo,
	check,
}: {
	group: OrderGroupWithItemsType;
	deliveryInfo: {
		shippingService: string;
		deliveryMinDate: string;
		deliveryMaxDate: string;
	};
	check: boolean;
}) {
	const [copiedGroupRef, setCopiedGroupRef] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);
	const [cancelReason, setCancelReason] = useState<CancellationReasonCode>(
		CancellationReasonCode.ORDERED_BY_MISTAKE,
	);
	const [cancelMessage, setCancelMessage] = useState('');
	const queryClient = useQueryClient();
	const { shippingService, deliveryMaxDate, deliveryMinDate } = deliveryInfo;
	const { coupon, couponId, subTotal, total, shippingFees } = group;

	const discountedAmount = Math.max(0, subTotal + shippingFees - total);
	const isBigScreen = useMediaQuery({ query: '(min-width: 1024px)' });

	const formattedGroupId = formatPackageId(group.id);
	const latestCancellation = group.cancellationRequests[0];
	const cancellationPending =
		latestCancellation?.status === CancellationRequestStatus.REQUESTED;
	const cancellationEligible = canRequestCancellation(group.packageStatus);
	const formatStage = (value: string) =>
		value
			.replaceAll('_', ' ')
			.toLowerCase()
			.replace(/^./, (character) => character.toUpperCase());

	const cancellationMutation = useMutation({
		mutationFn: () =>
			requestPackageCancellation({
				groupId: group.id,
				reasonCode: cancelReason,
				message: cancelMessage,
			}),
		onSuccess: () => {
			setShowCancelModal(false);
			setCancelMessage('');
			toast.success('Cancellation request sent to the seller.');
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.orders.detail(group.orderId),
				}),
				queryClient.invalidateQueries({ queryKey: queryKeys.profile.orderLists() }),
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.orderLists() }),
			]);
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	const handleCopyGroupId = () => {
		navigator.clipboard.writeText(formattedGroupId);
		setCopiedGroupRef(true);
		toast.success(`Package ID ${formattedGroupId} copied`);
		setTimeout(() => setCopiedGroupRef(false), 2000);
	};

	return (
		<>
			<div className='w-full bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden'>
				{/* Group Header */}
				<div className='flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-3'>
					<div className='flex items-center flex-wrap gap-3'>
						<div
							onClick={handleCopyGroupId}
							className='flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/30 cursor-pointer hover:bg-muted/80 transition-all'
							title='Click to copy Package ID'
						>
							<Store className='w-3.5 h-3.5 text-primary' />
							<span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
								Package
							</span>
							<span className='text-xs font-bold text-foreground font-mono'>
								{formattedGroupId}
							</span>
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleCopyGroupId();
								}}
								className='p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-all cursor-pointer'
								title='Copy Package ID'
							>
								{copiedGroupRef ? (
									<Check className='w-3 h-3 text-emerald-500' />
								) : (
									<Copy className='w-3 h-3' />
								)}
							</button>
						</div>

						{/* Store link */}
						<Link
							href={`/store/${group.store.url}`}
							className='flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group'
							title={`Visit ${group.store.name} store`}
						>
							<Image
								src={group.store.logo || '/assets/images/placeholder.png'}
								alt={group.store.name}
								width={32}
								height={32}
								className='w-7 h-7 rounded-full object-cover ring-1 ring-border/50'
							/>
							<span className='text-xs font-semibold text-foreground group-hover:text-primary transition-colors underline-offset-2 group-hover:underline'>
								{group.store.name}
							</span>
						</Link>

						<div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border/20'>
							<Truck className='w-3 h-3 text-primary' />
							<span>{shippingService}</span>
						</div>
					</div>

					<div className='flex flex-wrap items-center justify-end gap-2'>
						<PackageStatusTag status={group.packageStatus} />
						{group.shipment && (
							<ShipmentStatusTag status={group.shipment.status} />
						)}
					</div>
				</div>

				{/* Items list */}
				<div className='divide-y divide-border/30'>
					{group.items.map((product, index) =>
						isBigScreen ? (
							<ProductRowGrid
								key={product.id ?? `${group.id}-item-${index}`}
								product={product}
								canRequestReturn={
									check && ['Delivered', 'PickedUp'].includes(product.status)
								}
							/>
						) : (
							<ProductRow
								key={product.id ?? `${group.id}-item-${index}`}
								product={product}
								canRequestReturn={
									check && ['Delivered', 'PickedUp'].includes(product.status)
								}
							/>
						),
					)}
				</div>

				{/* Delivery Time Pill */}
				<div className='mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex flex-wrap items-center justify-between gap-2 text-xs'>
					<span className='flex items-center gap-2 font-medium text-muted-foreground'>
						<Calendar className='w-3.5 h-3.5 text-emerald-500' />
						Estimated Delivery Window
					</span>
					<span className='font-bold text-emerald-600 dark:text-emerald-400'>
						{deliveryMinDate} – {deliveryMaxDate}
					</span>
				</div>

				{group.fulfillmentEvents.length > 0 && (
					<details className='mt-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2'>
						<summary className='cursor-pointer text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
							Tracking history ({group.fulfillmentEvents.length})
						</summary>
						<ol className='mt-3 space-y-3 border-l border-border/60 pl-4'>
							{group.fulfillmentEvents.map((event) => (
								<li key={event.id} className='relative text-xs'>
									<span className='absolute -left-[1.18rem] top-1 size-2 rounded-full bg-primary' />
									<p className='font-medium text-foreground'>
										{event.entityType === 'PACKAGE' ? 'Package' : 'Shipment'}:{' '}
										{formatStage(event.nextStatus)}
									</p>
									<p className='mt-0.5 text-muted-foreground'>
										{new Date(event.createdAt).toLocaleString()} · {formatStage(event.actorRole)}
									</p>
									{event.message && (
										<p className='mt-1 text-muted-foreground'>{event.message}</p>
									)}
								</li>
							))}
						</ol>
					</details>
				)}

				{/* Group Financial Summary Footer */}
				<div className='mt-4 pt-4 border-t border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs'>
					<div className='flex items-center gap-2 flex-wrap'>
						{cancellationPending ? (
							<span className='flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400'>
								<AlertTriangle className='size-3.5' aria-hidden='true' />
								Cancellation requested
							</span>
						) : cancellationEligible ? (
							<button
								type='button'
								onClick={() => setShowCancelModal(true)}
								className='flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10 dark:text-red-400 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							>
								<XCircle className='w-3.5 h-3.5' aria-hidden='true' />
								Request cancellation
							</button>
						) : null}

						<div className='flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/30 border border-border/30 font-medium text-muted-foreground'>
							<span>Subtotal: <strong className='text-foreground'>${subTotal.toFixed(2)}</strong></span>
							<span>•</span>
							<span>Shipping: <strong className='text-foreground'>+${shippingFees.toFixed(2)}</strong></span>
						</div>

						{couponId && coupon && (
							<div className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'>
								<Tag className='w-3.5 h-3.5' />
								<span>Coupon ({coupon.code}) -{coupon.discount}% (-${discountedAmount.toFixed(2)})</span>
							</div>
						)}
					</div>

					<div className='text-right'>
						<span className='text-xs font-semibold text-muted-foreground mr-2'>Package Total:</span>
						<span className='text-sm font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20'>
							${total.toFixed(2)}
						</span>
					</div>
				</div>
			</div>

			<Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request package cancellation</DialogTitle>
						<DialogDescription>
							Send a cancellation request for {formattedGroupId} from{' '}
							{group.store.name}. The seller must review it before the package is
							handed off.
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 py-2'>
						<div className='space-y-2'>
							<Label htmlFor={`cancel-reason-${group.id}`}>Reason</Label>
							<select
								id={`cancel-reason-${group.id}`}
								value={cancelReason}
								onChange={(event) =>
									setCancelReason(event.target.value as CancellationReasonCode)
								}
								className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							>
								<option value={CancellationReasonCode.ORDERED_BY_MISTAKE}>Ordered by mistake</option>
								<option value={CancellationReasonCode.FOUND_BETTER_PRICE}>Found a better price</option>
								<option value={CancellationReasonCode.SHIPPING_TOO_SLOW}>Shipping is too slow</option>
								<option value={CancellationReasonCode.WRONG_ADDRESS}>Wrong address</option>
								<option value={CancellationReasonCode.WRONG_ITEM_OR_SIZE}>Wrong item or size</option>
								<option value={CancellationReasonCode.OTHER}>Other</option>
							</select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor={`cancel-message-${group.id}`}>Optional message</Label>
							<textarea
								id={`cancel-message-${group.id}`}
								value={cancelMessage}
								onChange={(event) => setCancelMessage(event.target.value)}
								maxLength={500}
								className='min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setShowCancelModal(false)}>
							Keep package
						</Button>
						<Button
							variant='destructive'
							disabled={cancellationMutation.isPending}
							onClick={() => cancellationMutation.mutate()}
						>
							Send request
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
