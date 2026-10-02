'use client';
import { ProductType, VariantSimplified } from '@/lib/types';
import Link from 'next/link';
import { useState, useRef } from 'react';
import StarRating from '@/components/StarRating';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCardImageSwiper from './swiper';
import VariantSwitcher from './variant-switcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/store/ui/button';
import { Heart } from 'lucide-react';
import ProductPrice from '../../product-page/product-info/product-price';
import { toggleWishlist, checkIsWishlisted } from '@/queries/user';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

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
	const [isInWishlist, setIsInWishlist] = useState(false);
	const checkedRef = useRef(false);
	const queryClient = useQueryClient();

	// Lazy-check: only hits the server on the first hover, not on every card mount
	const handleMouseEnter = () => {
		setIsHovered(true);
		if (checkedRef.current) return;
		checkedRef.current = true;
		checkIsWishlisted(id, variant.variantId).then((res) => {
			setIsInWishlist(res);
		}).catch(() => { checkedRef.current = false; });
	};

	const wishlistToggleMutation = useMutation({
		mutationFn: () => toggleWishlist(id, variant.variantId),
		onSuccess: (data) => {
			setIsInWishlist(data.isWishlisted);
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: queryKeys.profile.wishlist(1) });
		},
		onError: (error: Error) => {
			toast.error(error.message || String(error));
		},
	});

	const handleWishlistToggle = (e?: React.MouseEvent) => {
		e?.preventDefault();
		e?.stopPropagation();
		wishlistToggleMutation.mutate();
	};

	return (
		<div
			onMouseEnter={handleMouseEnter}
			onMouseLeave={() => setIsHovered(false)}
			className={cn(
				className || 'w-[190px] min-[480px]:w-[225px] min-[1530px]:w-full',
				'relative group',
				isHovered ? 'z-30' : 'z-10',
			)}
		>
			{/* Grid geometry spacer to preserve exact cell height without layout shifts */}
			<div
				className='invisible pointer-events-none select-none p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-transparent'
				aria-hidden='true'
			>
				<div className='relative w-full aspect-square mb-1.5 sm:mb-2' />
				<div className='h-8 sm:h-9' />
				{product.rating > 0 && product.sales > 0 && (
					<div className='h-4 sm:h-5 mt-0.5 sm:mt-1' />
				)}
				<div className='h-7' />
			</div>

			{/* Actual interactive card: seamlessly preserves smooth rounded corners throughout hover states */}
			<div
				className={cn(
					'group w-full absolute top-0 left-0 bg-secondary p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl transition-shadow duration-300 ease-in-out border',
					isHovered
						? 'border-border shadow-2xl'
						: 'border-transparent shadow-none',
				)}
			>
				{/* Top-Right Floating Wishlist Toggle Button */}
				<button
					type='button'
					onClick={handleWishlistToggle}
					className='absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-background/80 backdrop-blur-xs border border-border/60 shadow-xs flex items-center justify-center hover:scale-110 transition-all cursor-pointer'
					title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
				>
					<Heart
						className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors', {
							'fill-red-500 stroke-red-500': isInWishlist,
							'text-muted-foreground hover:text-foreground': !isInWishlist,
						})}
					/>
				</button>

				<div className='relative w-full'>
					<Link
						href={`/product/${slug}?variant=${variantSlug}`}
						className='w-full relative block overflow-hidden'
					>
						{/* Images Swiper */}
						<ProductCardImageSwiper key={variant.variantId} images={images} />
						{/* Title */}
						<div className='text-xs sm:text-sm text-main-primary font-medium leading-snug line-clamp-2 h-8 sm:h-9 overflow-hidden overflow-ellipsis'>
							{name} · {variantName}
						</div>
						{/* Rating - Sales */}
						{product.rating > 0 && product.sales > 0 && (
							<div className='flex items-center gap-x-1 h-4 sm:h-5 mt-0.5 sm:mt-1'>
								<StarRating
									count={5}
									size={12}
									color='#F5F5F5'
									activeColor='#FFD804'
									value={rating}
									isHalf
									edit={false}
								/>
								<div className='text-[10px] sm:text-xs text-main-secondary'>{sales} sold</div>
							</div>
						)}
						{/* Price */}
						<ProductPrice sizes={sizes} isCard handleChange={() => {}} />
					</Link>
				</div>

				{/* Smooth hover drawer inside unified card container */}
				<AnimatePresence>
					{isHovered && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.22, ease: 'easeInOut' }}
							className='space-y-2 overflow-hidden pt-2.5'
						>
							{/* Variant switcher */}
							<VariantSwitcher
								images={variantImages}
								variants={variants}
								setVariant={setVariant}
								selectedVariant={variant}
							/>
							{/* Action buttons */}
							<div className='flex items-center w-full'>
								<Button asChild className='w-full'>
									<Link
										className='text-white w-full text-center'
										href={`/product/${slug}?variant=${variantSlug}`}
									>
										Add to cart
									</Link>
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
