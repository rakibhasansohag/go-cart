'use client';
import Link from 'next/link';
import { CartIcon } from '@/components/store/icons';
import { useCartStore } from '@/cart-store/useCartStore';

export default function Cart() {
	// Get total items in the cart
	const totalItems = useCartStore((state) => state.totalItems);
	return (
		<div className='relative flex h-11 items-center px-1 sm:px-2 cursor-pointer'>
			<Link href='/cart' className='relative flex items-center text-white'>
				<span className='text-3xl inline-block'>
					<CartIcon />
				</span>
				<div className='ml-1 hidden sm:block'>
					<div className='min-h-3 min-w-6 -mt-1.5'>
						<span className='inline-block text-xs text-white leading-4 bg-orange-primary rounded-lg text-center font-bold min-h-3 px-1 min-w-6'>
							{totalItems}
						</span>
					</div>
					<b className='text-xs font-bold text-wrap leading-4 text-blue-primary'>
						Cart
					</b>
				</div>
				<span className='sm:hidden absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] text-white leading-none bg-orange-primary rounded-full font-bold px-1 py-0.5 min-w-4'>
					{totalItems}
				</span>
			</Link>
		</div>
	);
}
