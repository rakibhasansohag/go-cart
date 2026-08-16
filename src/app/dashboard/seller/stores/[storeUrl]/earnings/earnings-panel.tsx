'use client';

import { useEffect, useState } from 'react';

type Settlement = {
	id: string;
	status: string;
	sellerPayableCents: number;
	remainingPayableCents: number;
	eligibleAt: string | Date | null;
	orderGroup: { id: string };
};

function statusCopy(status: string) {
	if (status === 'BLOCKED') return 'Waiting for delivery evidence from the admin team.';
	if (status === 'HELD') return 'Delivery confirmed; waiting for the payout window.';
	if (status === 'ELIGIBLE') return 'Ready for the next weekly payday batch.';
	if (status === 'APPROVED') return 'Approved in a payday batch; transfer is next.';
	if (status === 'PROCESSING') return 'Transfer is being processed.';
	if (status === 'RELEASED') return 'Paid to the connected Stripe account.';
	return 'Review the payout status with the marketplace administrator.';
}

export default function EarningsPanel({
	storeUrl,
	payoutHoldDays,
	initialSettlements,
}: {
	storeUrl: string;
	payoutHoldDays: number;
	initialSettlements: Settlement[];
}) {
	const [settlements, setSettlements] = useState(initialSettlements);

	useEffect(() => {
		let active = true;
		const refresh = async () => {
			try {
				const response = await fetch(`/api/seller/settlements?storeUrl=${encodeURIComponent(storeUrl)}`, { cache: 'no-store' });
				if (!response.ok) return;
				const data = await response.json() as { settlements?: Settlement[] };
				if (active && data.settlements) setSettlements(data.settlements);
			} catch {
				// A temporary poll failure should not replace the last known ledger.
			}
		};
		const interval = window.setInterval(() => void refresh(), 5000);
		return () => {
			active = false;
			window.clearInterval(interval);
		};
	}, [storeUrl]);

	const held = settlements.filter((item) => ['HELD', 'BLOCKED'].includes(item.status)).reduce((sum, item) => sum + item.remainingPayableCents, 0);
	const released = settlements.filter((item) => item.status === 'RELEASED').reduce((sum, item) => sum + item.sellerPayableCents, 0);
	const holdCopy = payoutHoldDays === 0
		? 'Funds can become eligible immediately after delivery evidence (sandbox testing mode).'
		: `Funds wait for delivery evidence and the ${payoutHoldDays}-day return-risk window.`;

	return <>
		<div className='grid gap-4 sm:grid-cols-2'>
			<div className='rounded-xl border border-border p-5'><p className='text-xs text-muted-foreground'>Held or blocked</p><p className='mt-2 text-2xl font-semibold'>${(held / 100).toFixed(2)}</p><p className='mt-1 text-xs text-muted-foreground'>{holdCopy}</p></div>
			<div className='rounded-xl border border-border p-5'><p className='text-xs text-muted-foreground'>Released to seller</p><p className='mt-2 text-2xl font-semibold'>${(released / 100).toFixed(2)}</p><p className='mt-1 text-xs text-muted-foreground'>The platform commission is already reflected in each entry.</p></div>
		</div>
		<div className='overflow-x-auto rounded-xl border border-border'>
			<table className='w-full text-left text-sm'><thead className='bg-muted/50'><tr><th className='p-3'>Order group</th><th className='p-3'>Status</th><th className='p-3'>Seller payable</th><th className='p-3'>Next step</th><th className='p-3'>Eligible after</th></tr></thead><tbody>
				{settlements.map((item) => <tr key={item.id} className='border-t border-border/60 align-top'><td className='p-3 font-mono text-xs'>{item.orderGroup.id.slice(0, 8)}</td><td className='p-3 font-semibold'>{item.status}</td><td className='p-3'>${(item.sellerPayableCents / 100).toFixed(2)}</td><td className='max-w-md p-3 text-xs text-muted-foreground'>{statusCopy(item.status)}</td><td className='p-3'>{item.eligibleAt ? new Date(item.eligibleAt).toLocaleDateString('en-US') : 'Admin evidence required'}</td></tr>)}
				{settlements.length === 0 && <tr><td colSpan={5} className='p-8 text-center text-muted-foreground'>No paid order groups have generated a settlement yet.</td></tr>}
			</tbody></table>
		</div>
	</>;
}
