import { PACKAGE_STATUS_LABELS } from '@/lib/orders/fulfillment-state-machine';
import { cn } from '@/lib/utils';
import { PackageCheck } from 'lucide-react';
import { PackageStatus } from '@prisma/client';

const styles: Record<PackageStatus, string> = {
	[PackageStatus.PENDING]: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
	[PackageStatus.ACCEPTED]: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
	[PackageStatus.PROCESSING]:
		'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
	[PackageStatus.READY_FOR_HANDOFF]:
		'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
	[PackageStatus.HANDED_OFF]:
		'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
	[PackageStatus.CANCELLED]: 'bg-destructive/10 text-destructive',
};

export default function PackageStatusTag({ status }: { status: PackageStatus }) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
				styles[status],
			)}
		>
			<PackageCheck className='size-3 shrink-0' aria-hidden='true' />
			{PACKAGE_STATUS_LABELS[status]}
		</span>
	);
}
