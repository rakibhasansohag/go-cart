import { Badge } from '@/components/ui/badge';

const activeStates = new Set(['ACTIVE', 'READY', 'RELEASED', 'PAID']);
const problemStates = new Set(['BANNED', 'DISABLED', 'FAILED', 'BLOCKED', 'REJECTED', 'RESTRICTED']);

export function MarketplaceStatusBadge({ status }: { status: string }) {
	const normalized = status.replaceAll('_', ' ');
	const tone = activeStates.has(status)
		? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
		: problemStates.has(status)
			? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
			: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';

	return <Badge variant='outline' className={`font-semibold ${tone}`}>{normalized}</Badge>;
}
