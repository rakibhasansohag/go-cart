import { Calculator, Tag } from 'lucide-react';

export default function OrderTotalDetailsCard({
	details,
}: {
	details: {
		subTotal: number;
		shippingFees: number;
		total: number;
	};
}) {
	const { subTotal, shippingFees, total } = details;

	const discount = Math.max(0, subTotal + shippingFees - total);

	return (
		<div className='w-full bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-all'>
			<div className='flex items-center gap-2 mb-4 pb-3 border-b border-border/40'>
				<Calculator className='w-4 h-4 text-primary' />
				<h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
					Order Summary
				</h3>
			</div>

			<div className='space-y-3 text-xs'>
				<div className='flex items-center justify-between'>
					<span className='text-muted-foreground font-medium'>Subtotal</span>
					<span className='font-semibold text-foreground'>${subTotal.toFixed(2)}</span>
				</div>

				<div className='flex items-center justify-between'>
					<span className='text-muted-foreground font-medium'>Shipping Fees</span>
					<span className='font-semibold text-foreground'>+${shippingFees.toFixed(2)}</span>
				</div>

				<div className='flex items-center justify-between'>
					<span className='text-muted-foreground font-medium'>Estimated Taxes</span>
					<span className='font-semibold text-muted-foreground'>+$0.00</span>
				</div>

				{discount > 0 && (
					<div className='flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium'>
						<span className='flex items-center gap-1.5'>
							<Tag className='w-3.5 h-3.5' />
							Coupon Discount Applied
						</span>
						<span className='font-bold'>-${discount.toFixed(2)}</span>
					</div>
				)}

				<div className='pt-3 border-t border-border/60 flex items-center justify-between'>
					<span className='text-sm font-bold text-foreground'>Total Amount</span>
					<span className='text-base font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20'>
						${total.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	);
}
