export type MarketplaceStage = {
	id: 'order' | 'hold' | 'delivery' | 'returns' | 'payday' | 'payout';
	label: string;
	time: string;
	caption: string;
	description: string;
};

export const FLOW_STAGES: readonly MarketplaceStage[] = [
	{
		id: 'order',
		label: 'Order placed',
		time: 'Today · 10:14',
		caption: 'Customer payment captured',
		description:
			'The platform records the complete order and allocates each seller’s share before any payout is released.',
	},
	{
		id: 'hold',
		label: 'Funds held',
		time: 'Today · 10:15',
		caption: 'Return-risk window starts',
		description:
			'Seller earnings stay pending while the order is fulfilled. The seller can see the balance, but it is not payable yet.',
	},
	{
		id: 'delivery',
		label: 'Delivery confirmed',
		time: 'Day 3 · 14:22',
		caption: 'Proof of delivery received',
		description:
			'A trusted delivery event starts the seven-day return window for the buyer.',
	},
	{
		id: 'returns',
		label: 'Return window closes',
		time: 'Day 10 · 09:00',
		caption: 'Balance becomes eligible',
		description:
			'When no return is approved during the seven-day window, the held balance moves to the next payday queue.',
	},
	{
		id: 'payday',
		label: 'Weekly payday',
		time: 'Friday · 09:00',
		caption: 'Admin review completed',
		description:
			'GoCart groups eligible balances into a weekly batch so an admin can review the statement before release.',
	},
	{
		id: 'payout',
		label: 'Seller payout',
		time: 'Friday · 09:02',
		caption: 'Transfer released',
		description:
			'The seller receives the final settled amount. GoCart’s commission is shown separately and provider fees stay with the platform.',
	},
];

export function nextStageIndex(currentIndex: number): number {
	return Math.min(currentIndex + 1, FLOW_STAGES.length - 1);
}

export function progressPercent(currentIndex: number): number {
	if (FLOW_STAGES.length <= 1) return 100;
	return Math.round((currentIndex / (FLOW_STAGES.length - 1)) * 100);
}
