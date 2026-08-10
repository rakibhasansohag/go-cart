'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, MapPin, Package, Truck } from 'lucide-react';
import { ShipmentStatus } from '@prisma/client';
import { getShipmentTracking } from '@/queries/fulfillment';
import { queryKeys } from '@/lib/query-keys';

type TrackingShipment = Awaited<ReturnType<typeof getShipmentTracking>>[number];

const MILESTONES: Array<{ status: ShipmentStatus; label: string }> = [
	{ status: 'AWAITING_RECEIPT', label: 'Accepted' },
	{ status: 'RECEIVED_AT_HUB', label: 'Hub received' },
	{ status: 'IN_TRANSIT', label: 'In transit' },
	{ status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
	{ status: 'DELIVERED', label: 'Delivered' },
];

function label(value: string) {
	return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function trackingUrl(carrier?: string | null, number?: string | null) {
	if (!carrier || !number) return null;
	const normalized = carrier.toLowerCase();
	if (normalized.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(number)}`;
	if (normalized.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(number)}`;
	if (normalized.includes('ups')) return `https://www.ups.com/track?tracknum=${encodeURIComponent(number)}`;
	if (normalized.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(number)}`;
	return null;
}

function ShipmentTimelineCard({ shipment }: { shipment: TrackingShipment }) {
	const assignmentLabels = shipment.packageAssignments.map((assignment) => assignment.orderGroup.store.name);
	const currentRank = MILESTONES.findIndex((step) => step.status === shipment.status);
	const url = trackingUrl(shipment.carrier, shipment.trackingNumber);
	const events = [
		...shipment.trackingEvents.map((event) => ({
			id: event.id,
			at: event.occurredAt,
			title: label(event.status),
			description: event.description,
			location: event.location,
			failed: event.status === ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
		})),
		...shipment.deliveryAttempts.map((attempt) => ({
			id: attempt.id,
			at: attempt.occurredAt,
			title: `Delivery attempt ${attempt.attemptNumber}: ${label(attempt.outcome)}`,
			description: attempt.message || attempt.reasonCode,
			location: null,
			failed: attempt.outcome.toUpperCase() === 'FAILED',
		})),
	].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

	return (
		<section className='rounded-xl border border-border/60 bg-background p-4 sm:p-5 space-y-4' aria-label={`Shipment ${shipment.id}`}>
			<div className='flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-3'>
				<div className='flex items-center gap-2.5'>
					<div className='rounded-lg bg-primary/10 p-2 text-primary'><Package className='size-4' /></div>
					<div>
						<h2 className='font-semibold'>Shipment #{shipment.id.slice(-8).toUpperCase()}</h2>
						<p className='text-xs text-muted-foreground'>Package from {[...new Set(assignmentLabels)].join(', ')}</p>
					</div>
				</div>
				<span className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'><Truck className='size-3' />{label(shipment.status)}</span>
			</div>

			<div className='grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-3'>
				<div><span className='block text-muted-foreground'>Carrier / service</span><strong>{shipment.carrier || shipment.serviceLevel || 'Standard carrier'}</strong></div>
				<div><span className='block text-muted-foreground'>Tracking reference</span>{shipment.trackingNumber ? <>{url ? <a className='inline-flex items-center gap-1 font-semibold text-primary hover:underline' href={url} target='_blank' rel='noreferrer'>{shipment.trackingNumber}<ExternalLink className='size-3' /></a> : <strong>{shipment.trackingNumber}</strong>}</> : <span className='italic text-muted-foreground'>Pending tracking number</span>}</div>
				<div><span className='block text-muted-foreground'>Estimated delivery</span><strong>{shipment.estimatedDeliveryAt ? new Date(shipment.estimatedDeliveryAt).toLocaleDateString() : 'Not scheduled'}</strong></div>
			</div>

			<div className='grid grid-cols-5 gap-1 text-center'>
				{MILESTONES.map((step, index) => {
					const complete = currentRank >= 0 && index < currentRank;
					const active = step.status === shipment.status;
					return <div key={step.status} className='space-y-1'><div className={`mx-auto flex size-7 items-center justify-center rounded-full text-xs ${complete ? 'bg-emerald-600 text-white' : active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'border border-border bg-muted text-muted-foreground'}`}>{complete ? <CheckCircle2 className='size-4' /> : active ? <Clock3 className='size-3.5' /> : '•'}</div><span className='block text-[10px] leading-tight text-muted-foreground'>{step.label}</span></div>;
				})}
			</div>

			{shipment.items.length > 0 && <div className='border-t border-border/40 pt-3'><h3 className='mb-2 text-xs font-semibold'>Contents</h3><div className='grid gap-1 text-xs text-muted-foreground sm:grid-cols-2'>{shipment.items.map((item) => <div key={item.id} className='flex justify-between gap-3'><span>{item.orderItem.name}</span><strong className='text-foreground'>×{item.quantity}</strong></div>)}</div></div>}

			{events.length > 0 && <div className='border-t border-border/40 pt-3'><h3 className='mb-3 text-xs font-semibold'>Tracking history</h3><ol className='space-y-3'>{events.map((event) => <li key={event.id} className='flex gap-3 text-xs'><div className={`mt-0.5 rounded-full p-1 ${event.failed ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{event.failed ? <AlertCircle className='size-3.5' /> : <Clock3 className='size-3.5' />}</div><div className='min-w-0 flex-1'><div className='flex flex-wrap justify-between gap-2'><strong>{event.title}</strong><time className='text-muted-foreground'>{new Date(event.at).toLocaleString()}</time></div>{event.description && <p className='text-muted-foreground'>{event.description}</p>}{event.location && <p className='mt-1 inline-flex items-center gap-1 text-muted-foreground'><MapPin className='size-3' />{event.location}</p>}</div></li>)}</ol></div>}

			{shipment.proofOfDeliveryUrl && <div className='flex items-center justify-between border-t border-border/40 pt-3 text-xs'><span className='inline-flex items-center gap-1 font-medium text-emerald-600'><CheckCircle2 className='size-3.5' />Proof of delivery available</span><a className='inline-flex items-center gap-1 font-semibold text-primary hover:underline' href={shipment.proofOfDeliveryUrl} target='_blank' rel='noreferrer'>View confirmation<ExternalLink className='size-3' /></a></div>}
		</section>
	);
}

export default function ShipmentTrackingTimeline({ orderId }: { orderId: string }) {
	const { data: shipments } = useSuspenseQuery({ queryKey: queryKeys.orders.tracking(orderId), queryFn: () => getShipmentTracking(orderId) });
	if (!shipments.length) return null;
	return <div className='space-y-4'><div><h2 className='text-lg font-semibold'>Shipment tracking</h2><p className='text-sm text-muted-foreground'>Live carrier events, package contents, and delivery attempts.</p></div>{shipments.map((shipment) => <ShipmentTimelineCard key={shipment.id} shipment={shipment} />)}</div>;
}
