'use client';
import { useCartStore } from '@/cart-store/useCartStore';
import useFromStore from '@/hooks/useFromStore';
import { CartProductType, Country } from '@/lib/types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import CartHeader from './cart-header';
import CartProduct from '../cards/cart-product';
import CartSummary from './summary';
import FastDelivery from '../cards/fast-delivery';
import { SecurityPrivacyCard } from '../product-page/returns-security-privacy-card';
import EmptyCart from './empty-cart';
import { updateCartWithLatest } from '@/queries/user';
import CountryNote from '../shared/country-note';
import { Skeleton } from '@/components/ui/skeleton';

function CartPageSkeleton() {
	return (
		<main
			className='min-h-[calc(100vh-65px)] bg-f5 px-2'
			aria-busy='true'
			aria-label='Loading your cart'
		>
			<div className='mx-auto flex max-w-[1200px] flex-col gap-4 py-4 lg:flex-row'>
				<section className='min-w-0 flex-1 space-y-3' aria-label='Loading cart items'>
					<Skeleton className='h-28 w-full rounded-xl' />
					<Skeleton className='h-48 w-full rounded-xl' />
				</section>
				<aside className='w-full space-y-3 lg:w-[380px]' aria-label='Loading cart summary'>
					<Skeleton className='h-72 w-full rounded-xl' />
					<Skeleton className='h-32 w-full rounded-xl' />
				</aside>
			</div>
			<span className='sr-only'>Loading your saved cart.</span>
		</main>
	);
}

export default function CartContainer({
	userCountry,
}: {
	userCountry: Country;
}) {
	const storedCart = useFromStore(useCartStore, (state) => state.cart);
	const cartItems = useMemo(() => storedCart ?? [], [storedCart]);
	const setCart = useCartStore((state) => state.setCart);

	const [isInitialCartReady, setIsInitialCartReady] = useState(false);
	const [selectedItems, setSelectedItems] = useState<CartProductType[]>([]);
	const [totalShipping, setTotalShipping] = useState<number>(0);

	const lastSyncedCartKey = useRef('');

	useEffect(() => {
		if (storedCart === undefined) return;
		if (cartItems.length === 0) {
			setIsInitialCartReady(true);
			return;
		}

		const cartKey = `${userCountry.code}:${cartItems
			.map(
				(item) =>
					`${item.productId}:${item.variantId}:${item.sizeId}:${item.quantity}`,
			)
			.sort()
			.join('|')}`;
		if (lastSyncedCartKey.current === cartKey) {
			setIsInitialCartReady(true);
			return;
		}
		lastSyncedCartKey.current = cartKey;

		let cancelled = false;
		const loadAndSyncCart = async () => {
			try {
				const updatedCart = await updateCartWithLatest(cartItems);
				if (!cancelled) setCart(updatedCart);
			} catch {
				lastSyncedCartKey.current = '';
			} finally {
				if (!cancelled) setIsInitialCartReady(true);
			}
		};

		void loadAndSyncCart();
		return () => {
			cancelled = true;
		};
	}, [cartItems, setCart, storedCart, userCountry.code]);

	// TODO: Update the black and light mode features

	if (storedCart === undefined || !isInitialCartReady) {
		return <CartPageSkeleton />;
	}

	return (
		<div>
			{cartItems && cartItems.length > 0 ? (
				<>
					<div className='bg-f5 min-h-[calc(100vh-65px)] px-2'>
						<div className='max-w-[1200px] mx-auto py-4 flex flex-col gap-y-4 lg:flex-row'>
							<div className='min-w-0 flex-1'>
								{/* Cart header */}
								<CartHeader
									cartItems={cartItems}
									selectedItems={selectedItems}
									setSelectedItems={setSelectedItems}
								/>
								<div className='my-2'>
									<CountryNote country={userCountry.name} />
								</div>
								<div className='h-auto overflow-x-hidden overflow-auto mt-2'>
									{/* Cart items */}
									{cartItems.map((product) => (
										<CartProduct
											key={`${product.productSlug}-${product.variantSlug}`}
											product={product}
											selectedItems={selectedItems}
											setSelectedItems={setSelectedItems}
											setTotalShipping={setTotalShipping}
											userCountry={userCountry}
										/>
									))}
								</div>
							</div>
							{/* Cart side */}
							<div className='sticky top-4 lg:ml-5 w-full lg:w-[380px] max-h-max'>
								{/* Cart summary */}
								<CartSummary
									cartItems={cartItems}
									selectedItems={selectedItems}
									shippingFees={totalShipping}
								/>
								<div className='mt-2 p-4 bg-background px-6'>
									<FastDelivery />
								</div>
								<div className='mt-2 p-4 bg-background px-6'>
									<SecurityPrivacyCard />
								</div>
							</div>
						</div>
					</div>
				</>
			) : (
				<EmptyCart />
			)}
		</div>
	);
}
