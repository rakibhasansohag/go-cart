import { ShippingAddress } from '@prisma/client';
import { Dispatch, FC, SetStateAction, useRef, useState } from 'react';
import { Button } from '../ui/button';
import FastDelivery from './fast-delivery';
import { SecurityPrivacyCard } from '../product-page/returns-security-privacy-card';
import { toast } from 'sonner';
import { placeOrder } from '@/queries/user';
import { useCartStore } from '@/cart-store/useCartStore';
import { cn, getFriendlyErrorMessage } from '@/lib/utils';
import { CartWithCartItemsType } from '@/lib/types';
import ApplyCouponForm from '../forms/apply-coupon';
import { PulseLoader } from 'react-spinners';
import { useMutation } from '@tanstack/react-query';

import { coinsEarned, coinsToDiscount, maxRedeemableCoins, MIN_REDEEM_COINS } from '@/lib/loyalty/coins';
import { Coins } from 'lucide-react';

interface Props {
	shippingAddress: ShippingAddress | null;
	cartData: CartWithCartItemsType;
	setCartData: Dispatch<SetStateAction<CartWithCartItemsType>>;
	coinBalance?: number;
}

const PlaceOrderCard: FC<Props> = ({
	shippingAddress,
	setCartData,
	cartData,
	coinBalance = 0,
}) => {
	const { id, coupon, subTotal, shippingFees, total } = cartData;
	const emptyCart = useCartStore((state) => state.emptyCart);
	const submissionStarted = useRef(false);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [coinsToUse, setCoinsToUse] = useState<number>(0);
	const orderToastId = 'place-order-progress';

	const maxCoinsForCart = maxRedeemableCoins(subTotal);
	const usableCoinsCap = Math.min(coinBalance, maxCoinsForCart);
	const coinDiscountAmount = coinsToDiscount(coinsToUse);
	const finalTotal = Math.max(0, total - coinDiscountAmount);

	const placeOrderMutation = useMutation({
		mutationFn: async () => {
			if (!shippingAddress) {
				throw new Error('Select a shipping address first !');
			}
			const order = await placeOrder(shippingAddress, id, coinsToUse);
			if (order) return order;
			throw new Error('Failed to place order.');
		},
		onMutate: () => {
			toast.loading('Creating your order…', { id: orderToastId });
		},
		onSuccess: (order) => {
			setIsRedirecting(true);
			emptyCart();
			toast.success('Order created. Opening secure payment…', {
				id: orderToastId,
			});
			// Use a full document handoff after checkout so stale checkout/session
			// state cannot leak into the secure payment page transition.
			window.location.assign(`/order/${order.orderId}`);
		},
		onError: (error: unknown) => {
			submissionStarted.current = false;
			setIsRedirecting(false);
			const message = getFriendlyErrorMessage(error, 'Unable to place the order.');
			toast.error(message, {
				id: orderToastId,
			});
		},
	});

	const loading = placeOrderMutation.isPending || isRedirecting;

	const handlePlaceOrder = () => {
		if (submissionStarted.current || loading) return;
		if (!shippingAddress) {
			toast.error('Select a shipping address first !');
			return;
		}
		submissionStarted.current = true;
		placeOrderMutation.mutate();
	};

	let discountedAmount = 0;
	if (coupon) {
		discountedAmount = Math.max(0, subTotal + shippingFees - total);
	}

	return (
		<div className='sticky top-4 lg:ml-5 lg:w-[380px] max-h-max'>
			<div className='relative py-4 px-6 bg-background rounded-xl border border-border/10 shadow-sm'>
				<h1 className='text-main-primary text-2xl font-bold mb-4'>Summary</h1>
				<Info title='Subtotal' text={`${subTotal.toFixed(2)}`} />
				<Info title='Shipping Fees' text={`+${shippingFees.toFixed(2)}`} />
				<Info title='Taxes' text='+0.00' />
				{coupon && (
					<Info
						title={`Coupon (${coupon.code}) (-${coupon.discount}%)`}
						text={`-$${discountedAmount.toFixed(2)}`}
					/>
				)}
				{coinsToUse > 0 && (
					<Info
						title={`GoCoins (${coinsToUse} coins)`}
						text={`-$${coinDiscountAmount.toFixed(2)}`}
					/>
				)}
				<Info title='Total' text={`$${finalTotal.toFixed(2)}`} isBold noBorder />

				{/* Estimated GoCoins Earned Badge */}
				<div className='mt-3 pt-3 border-t border-border/10 flex items-center justify-between text-xs text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg'>
					<span className='flex items-center gap-x-1.5 font-medium'>
						<Coins className='w-4 h-4 text-amber-500' />
						Earn on this order:
					</span>
					<strong className='font-bold'>+{coinsEarned(finalTotal).toLocaleString()} GoCoins</strong>
				</div>
			</div>

			{/* GoCoins Selection Widget */}
			{coinBalance >= MIN_REDEEM_COINS && (
				<div className='mt-2 p-4 bg-background rounded-xl border border-border/10 shadow-sm'>
					<div className='flex items-center justify-between mb-2'>
						<div className='flex items-center gap-x-2 text-sm font-semibold text-main-primary'>
							<Coins className='w-4 h-4 text-amber-500' />
							<span>GoCoins Balance</span>
						</div>
						<span className='text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full'>
							{coinBalance.toLocaleString()} coins
						</span>
					</div>

					<p className='text-xs text-main-secondary mb-3'>
						Max redeemable for this order: <strong>{usableCoinsCap.toLocaleString()} coins</strong> (${coinsToDiscount(usableCoinsCap).toFixed(2)})
					</p>

					<div className='flex items-center gap-x-2'>
						<button
							type='button'
							disabled={coinsToUse <= 0}
							onClick={() => setCoinsToUse((prev) => Math.max(0, prev - 100))}
							className='w-8 h-8 rounded-lg bg-secondary text-main-primary font-bold hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center'
						>
							-
						</button>
						<input
							type='number'
							min={0}
							max={usableCoinsCap}
							step={100}
							value={coinsToUse || ''}
							placeholder='0'
							onChange={(e) => {
								const val = parseInt(e.target.value) || 0;
								const clamped = Math.min(usableCoinsCap, Math.max(0, val));
								setCoinsToUse(clamped);
							}}
							className='flex-1 h-8 rounded-lg border border-border/40 bg-background px-3 text-sm text-center text-main-primary outline-none focus:border-amber-500'
						/>
						<button
							type='button'
							disabled={coinsToUse >= usableCoinsCap}
							onClick={() =>
								setCoinsToUse((prev) =>
									Math.min(usableCoinsCap, prev + 100 >= MIN_REDEEM_COINS ? prev + 100 : MIN_REDEEM_COINS),
								)
							}
							className='w-8 h-8 rounded-lg bg-secondary text-main-primary font-bold hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center'
						>
							+
						</button>
					</div>

					{coinsToUse > 0 && (
						<div className='mt-2 flex items-center justify-between text-xs text-emerald-600 font-medium'>
							<span>Discount applied:</span>
							<span>-${coinDiscountAmount.toFixed(2)} off</span>
						</div>
					)}
				</div>
			)}
			<div className='mt-2'>
				{coupon ? (
					<div className='flex bg-background'>
						<svg width={16} height={96} xmlns='http://www.w3.org/2000/svg'>
							<path
								d='M 8 0 
         Q 4 4.8, 8 9.6 
         T 8 19.2 
         Q 4 24, 8 28.8 
         T 8 38.4 
         Q 4 43.2, 8 48 
         T 8 57.6 
         Q 4 62.4, 8 67.2 
         T 8 76.8 
         Q 4 81.6, 8 86.4 
         T 8 96 
         L 0 96 
         L 0 0 
         Z'
								fill='#66cdaa'
								stroke='#66cdaa'
								strokeWidth={2}
								strokeLinecap='round'
							/>
						</svg>
						<div className='mx-2 5 overflow-hidden w-full'>
							<p className='mt-1.5 text-xl font-bold text-emerald-400 leading-8 mr-3 overflow-hidden text-ellipsis whitespace-nowrap'>
								Coupon applied !
							</p>
							<p className='overflow-hidden leading-5 break-all text-zinc-400 max-h-10'>
								({coupon.code}) ({coupon.discount}%) discount
							</p>
							<p className='overflow-hidden text-sm leading-5 break-words text-zinc-400'>
								Coupon applied to{' '}
								{coupon.store?.name
									? `items from ${coupon.store.name}`
									: 'your entire order'}
							</p>
						</div>
					</div>
				) : (
					<div className='p-4 bg-background'>
						<ApplyCouponForm cartId={id} setCartData={setCartData} />
					</div>
				)}
			</div>
			<div className='mt-2 p-4 bg-background'>
				{loading && (
					<div
						role='status'
						aria-live='polite'
						className='mb-3 rounded-lg border border-border/60 bg-muted/30 p-3'
					>
						<div className='mb-2 h-3 w-3/4 animate-pulse rounded bg-muted-foreground/20' />
						<div className='h-3 w-1/2 animate-pulse rounded bg-muted-foreground/15' />
						<span className='sr-only'>
							Creating your order and opening secure payment.
						</span>
					</div>
				)}
				<Button
					type='button'
					onClick={handlePlaceOrder}
					disabled={loading || !shippingAddress}
					aria-busy={loading}
					className='w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
				>
					{loading ? (
						<>
							<PulseLoader size={5} color='currentColor' />
							<span>
								{isRedirecting ? 'Opening secure payment…' : 'Creating order…'}
							</span>
						</>
					) : (
						<span>Place order</span>
					)}
				</Button>
			</div>
			<div className='mt-2 p-4 bg-background px-6'>
				<FastDelivery />
			</div>
			<div className='mt-2 p-4 bg-background px-6'>
				<SecurityPrivacyCard />
			</div>
		</div>
	);
};

export default PlaceOrderCard;

const Info = ({
	title,
	text,
	isBold,
	noBorder,
}: {
	title: string;
	text: string;
	isBold?: boolean;
	noBorder?: boolean;
}) => {
	return (
		<div
			className={cn(
				'mt-2 font-medium flex items-center text-main-secondary text-sm pb-1 border-b',
				{
					'font-bold': isBold,
					'border-b-0': noBorder,
				},
			)}
		>
			<h2 className='overflow-hidden whitespace-nowrap text-ellipsis break-normal'>
				{title}
			</h2>
			<h3 className='flex-1 w-0 min-w-0 text-right'>
				<div className='px-0.5 text-main-primary'>
					<span className='text-main-primary text-lg inline-block break-all'>
						{text}
					</span>
				</div>
			</h3>
		</div>
	);
};
