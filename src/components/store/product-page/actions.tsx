'use client';
import { useEffect, useState } from 'react';
import QuantitySelector from './quantity-selector';
import ReturnPrivacySecurityCard from './returns-security-privacy-card';
import ShipTo from './shipping/ship-to';
import ShippingDetails from './shipping/shipping-details';
import { getShippingDetails } from '@/queries/product-optimized';
import { Size, Store } from '@prisma/client';
import {
	CartProductType,
	FreeShippingWithCountriesType,
	ShippingDetailsType,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import SocialShare from '../shared/social-share';
import { useCartStore } from '@/cart-store/useCartStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
type HandleChangeType = <T extends keyof CartProductType>(
	property: T,
	value: CartProductType[T],
) => void;
export default function ProductPageActions({
	shippingFeeMethod,
	freeShipping,
	freeShippingForAllCountries,
	store,
	userCountry,
	productToBeAddedToCart,
	weight,
	isProductValid,
	handleChange,
	maxQty,
	sizeId,
	sizes,
}: {
	shippingFeeMethod: string;
	userCountry: { name: string; code: string; city: string };
	store: Store;
	freeShippingForAllCountries: boolean;
	freeShipping: FreeShippingWithCountriesType | null;
	productToBeAddedToCart: CartProductType;
	weight: number;
	isProductValid: boolean;
	handleChange: HandleChangeType;
	maxQty: number;
	sizeId?: string;
	sizes: Size[];
}) {
	const { push } = useRouter();
	// Get the store action to add items to cart
	const addToCart = useCartStore((state) => state.addToCart);
	const [loading, setLoading] = useState(true);
	const [shippingDetails, setShippingDetails] =
		useState<ShippingDetailsType | null>(null);

	useEffect(() => {
		const getShippingDetailsHandler = async () => {
			const data = await getShippingDetails(
				shippingFeeMethod,
				userCountry,
				store,
				freeShipping,
				freeShippingForAllCountries,
			);
			setShippingDetails(data);
			setLoading(false);
			handleChange('shippingMethod', data.shippingFeeMethod);
			handleChange('deliveryTimeMax', data.deliveryTimeMax);
			handleChange('deliveryTimeMin', data.deliveryTimeMin);
			handleChange('shippingFee', data.shippingFee);
			handleChange('extraShippingFee', data.extraShippingFee);
			handleChange('isFreeShipping', data.isFreeShipping);
			handleChange('shippingService', data.shippingService);
		};
		getShippingDetailsHandler();
	}, [userCountry]);

	const handleAddToCart = () => {
		if (maxQty <= 0) return;
		addToCart(productToBeAddedToCart);
		toast.success('Product added to cart successfully.');
	};

	const handleBuy = () => {
		handleAddToCart();
		push('/cart');
	};
	return (
		<div className='bg-background border rounded-md overflow-hidden overflow-y-auto p-4 pb-0'>
			<>
				<ShipTo
					countryCode={userCountry.code}
					countryName={userCountry.name}
					city={userCountry.city}
				/>
				<div className='mt-3 space-y-3'>
					<ShippingDetails
						shippingDetails={shippingDetails}
						countryName={userCountry.name}
						quantity={productToBeAddedToCart.quantity}
						weight={weight}
						loading={loading}
					/>
				</div>
				<ReturnPrivacySecurityCard
					returnPolicy={shippingDetails?.returnPolicy}
					loading={loading}
				/>
			</>
			<div className='mt-5 bg-background bottom-0 pb-4 space-y-3 sticky'>
				{sizeId && (
					<div className='w-full flex justify-end mt-4'>
						<QuantitySelector
							productId={productToBeAddedToCart.productId}
							variantId={productToBeAddedToCart.variantId}
							sizeId={productToBeAddedToCart.sizeId}
							quantity={productToBeAddedToCart.quantity}
							stock={productToBeAddedToCart.stock}
							handleChange={handleChange}
							sizes={sizes}
						/>
					</div>
				)}
				<button
					disabled={!isProductValid}
					onClick={() => handleBuy()}
					className={cn(
						'relative w-full py-2.5 min-w-20 bg-orange-background hover:bg-orange-hover text-white h-11 rounded-3xl leading-6 inline-block font-bold whitespace-nowrap border border-orange-border cursor-pointer transition-all duration-300 ease-bezier-1 select-none',
						{
							'cursor-not-allowed': !isProductValid || maxQty <= 0,
						},
					)}
				>
					<span>Buy now</span>
				</button>
				<button
					disabled={!isProductValid}
					className={cn(
						'relative w-full py-2.5 min-w-20 bg-orange-border hover:bg-[#e4cdce] text-orange-hover h-11 rounded-3xl leading-6 inline-block font-bold whitespace-nowrap border border-orange-border cursor-pointer transition-all duration-300 ease-bezier-1 select-none',
						{
							'cursor-not-allowed': !isProductValid || maxQty <= 0,
						},
					)}
					onClick={() => handleAddToCart()}
				>
					<span>Add to cart</span>
				</button>
				<SocialShare
					url=''
					quote=''
					// url={`/product/${productData.productSlug}/${productData.variantSlug}`}
					// quote={`${productData.name} · ${productData.variantName}`}
				/>
			</div>
		</div>
	);
}
