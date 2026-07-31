import { SHIPMENT_STATUS_LABELS } from '@/lib/orders/fulfillment-state-machine';
import { cn } from '@/lib/utils';
import { ShipmentStatus } from '@prisma/client';
import { Truck } from 'lucide-react';

const completed = new Set<ShipmentStatus>([
	ShipmentStatus.DELIVERED,
	ShipmentStatus.PICKED_UP,
]);
const exception = new Set<ShipmentStatus>([
	ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
	ShipmentStatus.RETURNED_TO_HUB,
	ShipmentStatus.RETURNED_TO_SELLER,
	ShipmentStatus.CANCELLED,
]);

export default function ShipmentStatusTag({ status }: { status: ShipmentStatus }) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
				completed.has(status) &&
					'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
				exception.has(status) && 'bg-destructive/10 text-destructive',
				!completed.has(status) &&
					!exception.has(status) &&
					'bg-blue-500/10 text-blue-700 dark:text-blue-400',
			)}
		>
			<Truck className='size-3 shrink-0' aria-hidden='true' />
			{SHIPMENT_STATUS_LABELS[status]}
		</span>
	);
}
