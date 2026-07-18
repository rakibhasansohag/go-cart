'use client';
import { ProductType, VariantSimplified } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';
import ReactStars from 'react-rating-stars-component';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCardImageSwiper from './swiper';
import VariantSwitcher from './variant-switcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/store/ui/button';
import { Heart } from 'lucide-react';
import ProductPrice from '../../product-page/product-info/product-price';
import { addToWishlist } from '@/queries/user';
import { toast } from 'sonner';

export default function ProductCard({
	product,
	className,
}: {
	product: ProductType;
	className?: string;
}) {
	const { name, slug, rating, sales, variantImages, variants, id } = product;
	const [variant, setVariant] = useState<VariantSimplified>(variants[0]);
	const { variantSlug, variantName, images, sizes } = variant;
	const [isHovered, setIsHovered] = useState(false);

	const handleaddToWishlist = async () => {
		try {
			const res = await addToWishlist(id, variant.variantId);
			if (res) toast.success('Product successfully added to wishlist.');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			toast.error(error.toString());
		}
	};

	return (
		<div
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={cn(className || 'w-[190px] min-[480px]:w-[225px] min-[1530px]:w-full', 'relative')}
		>
			<div
				className={cn(
					'group w-full relative transition-all duration-300 bg-secondary ease-in-out p-4 border border-transparent',
					isHovered
						? 'rounded-t-3xl shadow-xl border-border'
						: 'rounded-3xl',
				)}
			>
				<div className='relative w-full h-full'>
					<Link
						href={`/product/${slug}?variant=${variantSlug}`}
						className='w-full relative inline-block overflow-hidden'
					>
						{/* Images Swiper */}
						<ProductCardImageSwiper images={images} />
						{/* Title */}
						<div className='text-sm text-main-primary h-[18px] overflow-hidden overflow-ellipsis line-clamp-1'>
							{name} · {variantName}
						</div>
						{/* Rating - Sales */}
						{product.rating > 0 && product.sales > 0 && (
							<div className='flex items-center gap-x-1 h-5'>
								<ReactStars
									count={5}
									size={24}
									color='#F5F5F5'
									activeColor='#FFD804'
									value={rating}
									isHalf
									edit={false}
								/>
								<div className='text-xs text-main-secondary'>{sales} sold</div>
							</div>
						)}
						{/* Price */}
						<ProductPrice sizes={sizes} isCard handleChange={() => {}} />
					</Link>
				</div>
				<AnimatePresence>
					{isHovered && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.2, ease: 'easeInOut' }}
							className='absolute -left-[1px] bg-secondary border-border border-x border-b w-[calc(100%+2px)] px-4 pb-4 rounded-b-3xl shadow-xl z-30 space-y-2 overflow-hidden'
						>
							{/* Variant switcher */}
							<VariantSwitcher
								images={variantImages}
								variants={variants}
								setVariant={setVariant}
								selectedVariant={variant}
							/>
							{/* Action buttons */}
							<div className='flex items-center gap-x-1'>
								<Button asChild>
									<Link
										className='text-main-primary'
										href={`/product/${slug}?variant=${variantSlug}`}
									>
										Add to cart
									</Link>
								</Button>
								<Button
									variant='black'
									size='icon'
									onClick={() => handleaddToWishlist()}
								>
									<Heart className='w-5 text-pink-300' />
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
