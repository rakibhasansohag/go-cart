import { CartProductType } from '@/lib/types';
import { FC, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getUserCartCoupon, saveUserCart } from '@/queries/user';
import { validateCouponCode } from '@/queries/coupon';
import { PulseLoader } from 'react-spinners';
import { useMutation } from '@tanstack/react-query';
import { Tag, Check, X } from 'lucide-react';

interface Props {
	cartItems: CartProductType[];
	selectedItems?: CartProductType[];
	shippingFees: number;
}

const CartSummary: FC<Props> = ({ cartItems, selectedItems = [], shippingFees }) => {
	const router = useRouter();
	const [couponCode, setCouponCode] = useState('');
	const [appliedCoupon, setAppliedCoupon] = useState<{
		code: string;
		discount: number;
		storeId?: string | null;
		storeName: string;
	} | null>(null);

	useEffect(() => {
		let isMounted = true;
		getUserCartCoupon().then((coupon) => {
			if (isMounted && coupon) {
				setAppliedCoupon(coupon);
			}
		});
		return () => {
			isMounted = false;
		};
	}, []);

	const saveCartMutation = useMutation({
		mutationFn: () =>
			saveUserCart(
				selectedItems.length > 0 ? selectedItems : cartItems,
				appliedCoupon?.code,
			),
		onSuccess: () => {
			router.push('/checkout');
		},
		onError: (error: Error) => {
			toast.error(error.message || error.toString());
		},
	});

	const couponMutation = useMutation({
		mutationFn: (code: string) => validateCouponCode(code),
		onSuccess: (data) => {
			setAppliedCoupon(data);
			toast.success(
				`Coupon "${data.code}" applied! (${data.discount}% OFF from ${data.storeName})`,
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Invalid coupon code');
		},
	});

	const loading = saveCartMutation.isPending;
	const itemsToCalculate = selectedItems.length > 0 ? selectedItems : cartItems;

	// Calculate subtotal from active items
	const subtotal = itemsToCalculate.reduce((total, item) => {
		return total + item.price * item.quantity;
	}, 0);

	// Calculate coupon discount based on whether coupon is Global or Store-Specific
	let discountAmount = 0;
	if (appliedCoupon) {
		const applicableItems = appliedCoupon.storeId
			? itemsToCalculate.filter(
					(item) => (item.storeId || (item as any).storeId) === appliedCoupon.storeId,
			  )
			: itemsToCalculate;

		const applicableSubtotal = applicableItems.reduce((acc, item) => {
			return acc + item.price * item.quantity;
		}, 0);

		discountAmount = (applicableSubtotal * appliedCoupon.discount) / 100;
	}

	// Calculate final total
	const total = Math.max(0, subtotal + shippingFees - discountAmount);

	const handleSaveCart = () => {
		saveCartMutation.mutate();
	};

	const handleApplyCoupon = (e: React.FormEvent) => {
		e.preventDefault();
		if (!couponCode.trim()) return;
		couponMutation.mutate(couponCode);
	};

	return (
		<div className='relative py-4 px-6 bg-background rounded-xl border border-border/60 shadow-xs'>
			<h1 className='text-gray-900 dark:text-gray-100 text-2xl font-bold mb-4'>
				Summary
			</h1>

			{/* Promo / Coupon Input */}
			<div className='mb-4 p-3 bg-muted/30 rounded-xl border border-border/50'>
				<label className='text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5'>
					<Tag className='w-3.5 h-3.5 text-primary' />
					Have a Promo Code?
				</label>
				{appliedCoupon ? (
					<div className='flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium'>
						<span className='flex items-center gap-1'>
							<Check className='w-3.5 h-3.5' />
							{appliedCoupon.code} ({appliedCoupon.discount}% OFF)
						</span>
						<button
							type='button'
							onClick={() => {
								const activeItems =
									selectedItems.length > 0 ? selectedItems : cartItems;
								setAppliedCoupon(null);
								setCouponCode('');
								toast.info('Coupon code removed');
								saveUserCart(activeItems, '').catch(() => {});
							}}
							className='hover:opacity-75 transition-opacity'
							title='Remove coupon'
						>
							<X className='w-3.5 h-3.5' />
						</button>
					</div>
				) : (
					<form onSubmit={handleApplyCoupon} className='flex gap-2'>
						<input
							type='text'
							placeholder='Enter coupon code'
							value={couponCode}
							onChange={(e) => setCouponCode(e.target.value)}
							className='flex-1 h-8 text-xs px-2.5 rounded-md bg-background border border-border outline-none focus:border-primary uppercase'
						/>
						<Button
							type='submit'
							disabled={couponMutation.isPending || !couponCode.trim()}
							className='!h-8 !w-auto px-4 text-xs font-semibold'
						>
							{couponMutation.isPending ? 'Applying...' : 'Apply'}
						</Button>
					</form>
				)}
			</div>

			<div className='mt-4 font-medium flex items-center text-main-primary text-sm pb-1 border-b'>
				<h2 className='overflow-hidden whitespace-nowrap text-ellipsis break-normal'>
					Subtotal
				</h2>
				<h3 className='flex-1 w-0 min-w-0 text-right'>
					<span className='px-0.5 text-main-primary'>
						<div className='text-main-primary text-lg inline-block break-all font-semibold'>
							${subtotal.toFixed(2)}
						</div>
					</span>
				</h3>
			</div>
			<div className='mt-2 font-medium flex items-center text-main-primary text-sm pb-1 border-b'>
				<h2 className='overflow-hidden whitespace-nowrap text-ellipsis break-normal'>
					Shipping Fees
				</h2>
				<h3 className='flex-1 w-0 min-w-0 text-right'>
					<span className='px-0.5 text-main-primary'>
						<div className='text-main-primary text-lg inline-block break-all font-semibold'>
							+${shippingFees.toFixed(2)}
						</div>
					</span>
				</h3>
			</div>

			{discountAmount > 0 && (
				<div className='mt-2 font-medium flex items-center text-emerald-600 dark:text-emerald-400 text-sm pb-1 border-b'>
					<h2 className='overflow-hidden whitespace-nowrap text-ellipsis break-normal'>
						Coupon Discount ({appliedCoupon?.discount}%)
					</h2>
					<h3 className='flex-1 w-0 min-w-0 text-right'>
						<span className='px-0.5'>
							<div className='text-lg inline-block break-all font-semibold'>
								-${discountAmount.toFixed(2)}
							</div>
						</span>
					</h3>
				</div>
			)}

			<div className='mt-2 font-medium flex items-center text-main-primary text-sm pb-1 border-b'>
				<h2 className='overflow-hidden whitespace-nowrap text-ellipsis break-normal'>
					Taxes
				</h2>
				<h3 className='flex-1 w-0 min-w-0 text-right'>
					<span className='px-0.5 text-main-primary'>
						<div className='text-main-primary text-lg inline-block break-all'>
							+$0.00
						</div>
					</span>
				</h3>
			</div>
			<div className='mt-3 font-bold flex items-center text-main-primary text-sm'>
				<h2 className='overflow-hidden whitespace-nowrap text-ellipsis break-normal text-base'>
					Total
				</h2>
				<h3 className='flex-1 w-0 min-w-0 text-right'>
					<span className='px-0.5 text-main-primary'>
						<div className='text-main-primary text-xl font-bold inline-block break-all'>
							${total.toFixed(2)}
						</div>
					</span>
				</h3>
			</div>
			<div className='my-3'>
				<Button onClick={() => handleSaveCart()} className='w-full h-11 text-sm font-bold'>
					{loading ? (
						<PulseLoader size={5} color='#fff' />
					) : (
						<span>Checkout ({itemsToCalculate.length})</span>
					)}
				</Button>
			</div>
		</div>
	);
};

export default CartSummary;
