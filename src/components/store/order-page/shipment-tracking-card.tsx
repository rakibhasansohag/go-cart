'use client';

import React from 'react';
import type { ShipmentStatus } from '@prisma/client';
import { Package, Truck, CheckCircle2, Clock, AlertCircle, ExternalLink, MapPin } from 'lucide-react';

interface ShipmentTrackingProps {
	shipment: {
		id: string;
		status: ShipmentStatus;
		carrier?: string | null;
		trackingNumber?: string | null;
		serviceLevel?: string | null;
		estimatedDeliveryAt?: Date | string | null;
		proofOfDeliveryUrl?: string | null;
		failureReasonCode?: string | null;
		failureMessage?: string | null;
		orderGroup: {
			id: string;
			packageStatus: string;
			store: {
				name: string;
				url: string;
				logo?: string | null;
			};
		};
		trackingEvents?: Array<{
			id: string;
			status: ShipmentStatus;
			location?: string | null;
			description?: string | null;
			occurredAt: Date | string;
		}>;
	};
}

const MILESTONES: Array<{ status: ShipmentStatus; label: string }> = [
	{ status: 'AWAITING_RECEIPT', label: 'Accepted' },
	{ status: 'RECEIVED_AT_HUB', label: 'Hub Received' },
	{ status: 'IN_TRANSIT', label: 'In Transit' },
	{ status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
	{ status: 'DELIVERED', label: 'Delivered' },
];

function getCarrierTrackingUrl(carrier?: string | null, trackingNumber?: string | null): string | null {
	if (!carrier || !trackingNumber) return null;
	const norm = carrier.toLowerCase();
	if (norm.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackingNumber)}`;
	if (norm.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
	if (norm.includes('ups')) return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
	if (norm.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
	return null;
}

function formatStatusLabel(status: string): string {
	return status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ShipmentTrackingCard({ shipment }: ShipmentTrackingProps) {
	const { orderGroup, carrier, trackingNumber, serviceLevel, estimatedDeliveryAt, proofOfDeliveryUrl, failureMessage } = shipment;
	const trackingUrl = getCarrierTrackingUrl(carrier, trackingNumber);

	const getStepState = (milestoneStatus: ShipmentStatus) => {
		const orderMap: Record<string, number> = {
			AWAITING_RECEIPT: 1,
			RECEIVED_AT_HUB: 2,
			READY_FOR_DISPATCH: 2,
			IN_TRANSIT: 3,
			OUT_FOR_DELIVERY: 4,
			DELIVERED: 5,
		};
		const currentRank = orderMap[shipment.status] ?? 1;
		const targetRank = orderMap[milestoneStatus] ?? 1;
		if (currentRank > targetRank) return 'COMPLETED';
		if (currentRank === targetRank) return 'ACTIVE';
		return 'PENDING';
	};

	return (
		<div className='rounded-xl border border-border/60 bg-background p-4 sm:p-5 space-y-4 text-sm'>
			{/* Header */}
			<div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3'>
				<div className='flex items-center gap-2.5'>
					<div className='rounded-lg bg-primary/10 p-2 text-primary'>
						<Package className='size-4' />
					</div>
					<div>
						<span className='font-semibold block text-foreground'>
							Package #{orderGroup.id.slice(-8).toUpperCase()}
						</span>
						<span className='text-xs text-muted-foreground'>
							Fulfilled by {orderGroup.store.name}
						</span>
					</div>
				</div>

				<div className='flex items-center gap-2'>
					<span className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize'>
						<Truck className='size-3' />
						{formatStatusLabel(shipment.status)}
					</span>
				</div>
			</div>

			{/* Carrier & Tracking Meta */}
			<div className='grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-xs'>
				<div>
					<span className='text-muted-foreground block font-medium'>Carrier / Method</span>
					<span className='font-semibold text-foreground'>{carrier || serviceLevel || 'Standard Carrier'}</span>
				</div>
				<div>
					<span className='text-muted-foreground block font-medium'>Tracking Reference</span>
					{trackingNumber ? (
						trackingUrl ? (
							<a
								href={trackingUrl}
								target='_blank'
								rel='noreferrer'
								className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
							>
								{trackingNumber}
								<ExternalLink className='size-3' />
							</a>
						) : (
							<span className='font-semibold text-foreground'>{trackingNumber}</span>
						)
					) : (
						<span className='text-muted-foreground italic'>Pending tracking #</span>
					)}
				</div>
				<div>
					<span className='text-muted-foreground block font-medium'>Estimated Delivery</span>
					<span className='font-semibold text-foreground'>
						{estimatedDeliveryAt ? new Date(estimatedDeliveryAt).toLocaleDateString() : '7 - 14 Days'}
					</span>
				</div>
			</div>

			{/* Failure alert if present */}
			{failureMessage && (
				<div className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2'>
					<AlertCircle className='size-4 shrink-0 mt-0.5' />
					<div>
						<span className='font-semibold block'>Delivery Attempt Exception</span>
						<span>{failureMessage}</span>
					</div>
				</div>
			)}

			{/* Interactive Milestone Progress Bar */}
			<div className='pt-2'>
				<span className='text-xs font-semibold text-muted-foreground block mb-3'>Tracking Milestones:</span>
				<div className='grid grid-cols-5 items-center gap-1 text-center relative'>
					{MILESTONES.map((step) => {
						const state = getStepState(step.status);
						return (
							<div key={step.status} className='flex flex-col items-center gap-1.5 z-10'>
								<div
									className={`size-7 rounded-full flex items-center justify-center transition-colors text-xs font-bold ${
										state === 'COMPLETED'
											? 'bg-emerald-600 text-white'
											: state === 'ACTIVE'
											? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
											: 'bg-muted text-muted-foreground border border-border'
									}`}
								>
									{state === 'COMPLETED' ? (
										<CheckCircle2 className='size-4' />
									) : state === 'ACTIVE' ? (
										<Clock className='size-3.5 animate-pulse' />
									) : (
										'•'
									)}
								</div>
								<span className={`text-[11px] font-medium leading-tight max-w-[70px] ${state === 'ACTIVE' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
									{step.label}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Proof of Delivery if available */}
			{proofOfDeliveryUrl && (
				<div className='pt-2 border-t border-border/40 flex items-center justify-between text-xs'>
					<span className='text-muted-foreground font-medium flex items-center gap-1'>
						<MapPin className='size-3.5 text-emerald-600' /> Proof of Delivery Available
					</span>
					<a
						href={proofOfDeliveryUrl}
						target='_blank'
						rel='noreferrer'
						className='text-primary font-semibold hover:underline flex items-center gap-1'
					>
						View Confirmation
						<ExternalLink className='size-3' />
					</a>
				</div>
			)}
		</div>
	);
}
