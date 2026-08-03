import type { ReturnRequestStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<ReturnRequestStatus, string> = {
	REQUESTED: 'Requested',
	UNDER_REVIEW: 'Under review',
	MORE_INFO_REQUIRED: 'More information needed',
	APPROVED: 'Approved',
	REJECTED: 'Rejected',
	AWAITING_SHIPMENT: 'Awaiting shipment',
	IN_TRANSIT: 'Return in transit',
	RECEIVED: 'Received',
	REFUND_PENDING: 'Refund pending',
	REFUNDED: 'Refunded',
	EXCHANGE_PENDING: 'Exchange pending',
	EXCHANGED: 'Exchanged',
	CANCELLED: 'Cancelled',
	ESCALATED: 'Escalated',
	CLOSED: 'Closed',
};

const STATUS_STYLES: Record<ReturnRequestStatus, string> = {
	REQUESTED: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
	UNDER_REVIEW:
		'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
	MORE_INFO_REQUIRED:
		'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300',
	APPROVED:
		'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	REJECTED: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
	AWAITING_SHIPMENT:
		'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
	IN_TRANSIT:
		'border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
	RECEIVED:
		'border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
	REFUND_PENDING:
		'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
	REFUNDED:
		'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	EXCHANGE_PENDING:
		'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
	EXCHANGED:
		'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	CANCELLED:
		'border-muted-foreground/25 bg-muted text-muted-foreground',
	ESCALATED:
		'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
	CLOSED: 'border-border bg-muted text-muted-foreground',
};

export function getReturnStatusLabel(status: ReturnRequestStatus) {
	return STATUS_LABELS[status];
}

export default function ReturnStatus({
	status,
}: {
	status: ReturnRequestStatus;
}) {
	return (
		<span
			className={cn(
				'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold',
				STATUS_STYLES[status],
			)}
		>
			{getReturnStatusLabel(status)}
		</span>
	);
}
