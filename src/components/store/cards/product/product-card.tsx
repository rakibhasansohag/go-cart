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
		});
	};

	const wishlistToggleMutation = useMutation({
		mutationFn: () => toggleWishlist(id, variant.variantId),
		onSuccess: (data) => {
			setIsInWishlist(data.isWishlisted);
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: queryKeys.profile.wishlist(1) });
		},
		onError: (error: any) => {
			toast.error(error.message || error.toString());
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
			className={cn(className || 'w-[190px] min-[480px]:w-[225px] min-[1530px]:w-full', 'relative group')}
		>
			<div
				className={cn(
					'group w-full relative transition-all duration-300 bg-secondary ease-in-out p-4 border border-transparent',
					isHovered
						? 'rounded-t-3xl shadow-xl border-border'
						: 'rounded-3xl',
				)}
			>
				{/* Top-Right Floating Wishlist Toggle Button */}
				<button
					type='button'
					onClick={handleWishlistToggle}
					className='absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-background/80 backdrop-blur-xs border border-border/60 shadow-xs flex items-center justify-center hover:scale-110 transition-all cursor-pointer'
					title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
				>
					<Heart
						className={cn('w-4 h-4 transition-colors', {
							'fill-red-500 stroke-red-500': isInWishlist,
							'text-muted-foreground hover:text-foreground': !isInWishlist,
						})}
					/>
				</button>

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
								<StarRating
									count={5}
									size={14}
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
							<div className='flex items-center w-full'>
								<Button asChild className='w-full'>
									<Link
										className='text-main-primary w-full text-center'
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
