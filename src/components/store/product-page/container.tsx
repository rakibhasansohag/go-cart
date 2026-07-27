'use client';

import {
	CartProductType,
	Country,
	ProductDataType,
	ProductVariantDataType,
} from '@/lib/types';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import ProductSwiper from './product-swiper';
import ProductInfo from './product-info/product-info';
import { cn, isProductValidToAdd, updateProductHistory } from '@/lib/utils';
import { useCartStore } from '@/cart-store/useCartStore';
import useFromStore from '@/hooks/useFromStore';
import { setCookie } from 'cookies-next';
import ProductPageActions from './actions';
import { motion } from 'framer-motion';

interface Props {
	productData: ProductDataType;
	children: ReactNode;
	variantSlug: string;
	userCountry: Country;
}

const ProductPageContainer: FC<Props> = ({
	productData,
	variantSlug,
	children,
	userCountry,
}) => {
	const { id, slug, variants } = productData;

	const [variant, setVariant] = useState<ProductVariantDataType>(
		variants.find((v) => v.slug === variantSlug) || variants[0],
	);

	useEffect(() => {
		const variant = variants.find((v) => v.slug === variantSlug);
		if (variant) {
			setVariant(variant);
		}
	}, [variantSlug, variants]);

	const [sizeId, setSizeId] = useState(
		variant.sizes.length === 1 ? variant.sizes[0].id : '',
	);

	const {
		id: variantId,
		images,
		variantName,
		variantImage,
		weight,
		sizes,
	} = variant;

	const [activeImage, setActiveImage] = useState<{ url: string } | null>(
		images[0],
	);

	const data: CartProductType = {
		productId: id,
		variantId,
		productSlug: slug,
		variantSlug: variant.slug,
		name: productData.name,
		variantName: variantName,
		image: images[0].url,
		variantImage: variantImage,
		quantity: 1,
		price: 0,
		sizeId: sizeId || '',
		size: '',
		stock: 1,
		weight: weight,
		shippingMethod: '',
		shippingService: '',
		shippingFee: 0,
		extraShippingFee: 0,
		deliveryTimeMin: 0,
		deliveryTimeMax: 0,
		isFreeShipping: false,
	};

	const [productToBeAddedToCart, setProductToBeAddedToCart] =
		useState<CartProductType>(data);

	const { stock } = productToBeAddedToCart;

	const [isProductValid, setIsProductValid] = useState<boolean>(false);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleChange = (property: keyof CartProductType, value: any) => {
		setProductToBeAddedToCart((prevProduct) => ({
			...prevProduct,
			[property]: value,
		}));
	};

	useEffect(() => {
		setProductToBeAddedToCart((prevProduct) => ({
			...prevProduct,
			productId: id,
			variantId,
			productSlug: slug,
			variantSlug: variant.slug,
			name: productData.name,
			variantName: variantName,
			image: images[0].url,
			variantImage: variantImage,
			stock: variant.sizes.find((s) => s.id === sizeId)?.quantity || 1,
			weight: weight,
		}));
	}, [
		id,
		slug,
		variantSlug,
		variant,
		productData,
		variantName,
		variantImage,
		weight,
		images,
		sizeId,
	]);

	useEffect(() => {
		const check = isProductValidToAdd(productToBeAddedToCart);
		if (check !== isProductValid) {
			setIsProductValid(check);
		}
	}, [productToBeAddedToCart, isProductValid]);

	const setCart = useCartStore((state) => state.setCart);
	const cartItems = useFromStore(useCartStore, (state) => state.cart);

	useEffect(() => {
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === 'cart') {
				try {
					const parsedValue = event.newValue
						? JSON.parse(event.newValue)
						: null;

					if (
						parsedValue &&
						parsedValue.state &&
						Array.isArray(parsedValue.state.cart)
					) {
						setCart(parsedValue.state.cart);
					}
				} catch (error) {}
			}
		};

		window.addEventListener('storage', handleStorageChange);
		return () => {
			window.removeEventListener('storage', handleStorageChange);
		};
	}, [setCart]);

	updateProductHistory(variantId);

	const maxQty = useMemo(() => {
		const search_product = cartItems?.find(
			(p) =>
				p.productId === id && p.variantId === variantId && p.sizeId === sizeId,
		);
		return search_product
			? search_product.stock - search_product.quantity
			: stock;
	}, [cartItems, id, variantId, sizeId, stock]);

	setCookie(`viewedProduct_${id}`, 'true', {
		maxAge: 3600,
		path: '/',
	});

	// Smooth scroll-driven floating action card for desktop
	const [isFixed, setIsFixed] = useState(false);
	const [offsetLeft, setOffsetLeft] = useState(0);

	const handleScroll = () => {
		const childrenElement = document.getElementById('children-container');
		if (childrenElement) {
			const rect = childrenElement.getBoundingClientRect();
			if (window.scrollY > 450) {
				setIsFixed(true);
				setOffsetLeft(rect.right);
			} else {
				setIsFixed(false);
			}
		}
	};

	useEffect(() => {
		window.addEventListener('scroll', handleScroll);
		window.addEventListener('resize', handleScroll);
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleScroll);
		};
	}, []);

	return (
		<div className='relative'>
			<div className='w-full xl:flex xl:gap-4 items-start'>
				<div className='w-full flex-1'>
					<ProductSwiper
						images={variant.images}
						activeImage={activeImage || images[0]}
						setActiveImage={setActiveImage}
					/>
				</div>
				<div className='w-full mt-4 md:mt-0 flex flex-col gap-4 lg:flex-row items-start'>
					{/* Product main info */}
					<ProductInfo
						productData={productData}
						variant={variant}
						variantSlug={variantSlug}
						sizeId={sizeId}
						setSizeId={setSizeId}
						handleChange={handleChange}
						setActiveImage={setActiveImage}
						setVariant={setVariant}
						quantity={productToBeAddedToCart.quantity}
					/>
					{/* Shipping details - buy actions buttons with Framer Motion spring-like smooth transition */}
					<motion.div
						initial={false}
						animate={{
							y: isFixed ? 0 : -8,
							scale: isFixed ? 1 : 1,
							boxShadow: isFixed
								? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
								: '0 0px 0px 0px rgb(0 0 0 / 0)',
						}}
						transition={{
							duration: 0.38,
							ease: [0.16, 1, 0.3, 1],
						}}
						className={cn(
							'w-full dark:bg-background lg:w-[390px] z-20 rounded-2xl',
							isFixed
								? 'lg:fixed lg:top-[76px] ring-1 ring-border/50'
								: 'relative',
						)}
						style={{
							left: isFixed ? `${offsetLeft + 20}px` : 'auto',
						}}
					>
						<ProductPageActions
							freeShipping={productData.freeShipping}
							shippingFeeMethod={productData.shippingFeeMethod}
							store={productData.store}
							userCountry={userCountry}
							weight={variant.weight}
							freeShippingForAllCountries={
								productData.freeShippingForAllCountries
							}
							productToBeAddedToCart={productToBeAddedToCart}
							isProductValid={isProductValid}
							handleChange={handleChange}
							maxQty={maxQty}
							sizeId={sizeId}
							sizes={sizes}
						/>
					</motion.div>
				</div>
			</div>
			{/* Reserved desktop width for lower content (reviews, specs, description) */}
			<div
				id='children-container'
				className='lg:w-[calc(100%-410px)] mt-6 pb-16'
			>
				{children}
			</div>
		</div>
	);
};

export default ProductPageContainer;
