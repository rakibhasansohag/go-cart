'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { applyCouponToOrder } from '@/queries/coupon';
import { useRouter } from 'next/navigation';
import { Tag } from 'lucide-react';

export default function ApplyOrderCouponForm({ orderId }: { orderId: string }) {
	const router = useRouter();
	const [code, setCode] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!code.trim()) return;

		try {
			setLoading(true);
			const res = await applyCouponToOrder(code, orderId);
			toast.success(res.message);
			setCode('');
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to apply coupon.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='p-3 bg-muted/30 rounded-xl border border-border/50 text-xs'>
			<label className='font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5'>
				<Tag className='w-3.5 h-3.5 text-primary' />
				Have a Promo Code?
			</label>
			<form onSubmit={handleSubmit} className='flex gap-2 mt-1'>
				<input
					type='text'
					placeholder='Enter promo code'
					value={code}
					onChange={(e) => setCode(e.target.value)}
					className='flex-1 h-8 text-xs px-2.5 rounded-md bg-background border border-border outline-none focus:border-primary uppercase font-mono'
				/>
				<Button
					type='submit'
					disabled={loading || !code.trim()}
					className='!h-8 px-3 text-xs font-semibold'
				>
					{loading ? 'Applying...' : 'Apply'}
				</Button>
			</form>
		</div>
	);
}
