/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ProductType, VariantSimplified } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';

import ProductCardImageSwiper from './swiper';
import VariantSwitcher from './variant-switcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/store/ui/button';
import { Heart } from 'lucide-react';
import ProductPrice from '../../product-page/product-info/product-price';
import { addToWishlist } from '@/queries/user';
import { toast } from 'sonner';
import SimpleStars from '../../ui/SimpleStars';

export default function ProductCard({ product }: { product: ProductType }) {
	const { name, slug, rating, sales, variantImages, variants, id } = product;
	const [variant, setVariant] = useState<VariantSimplified>(variants[0]);
	const { variantSlug, variantName, images, sizes } = variant;

	const handleaddToWishlist = async () => {
		try {
			const res = await addToWishlist(id, variant.variantId);
			if (res) toast.success('Product successfully added to wishlist.');
		} catch (error: any) {
			toast.error(error.toString());
		}
	};

	return (
		<div>
			<div
				className={cn(
					'group w-[190px] min-[480px]:w-[225px] relative transition-all duration-75 bg-accent ease-in-out p-4 rounded-t-3xl border border-transparent hover:shadow-xl hover:border-border',
					{
						'': true,
					},
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
							<div className='flex items-center gap-x-1 '>
								<SimpleStars
									value={Number(product.rating) || 0}
									size={14}
									className='text-yellow-500'
								/>
								<div className='text-xs text-main-secondary'>{sales} sold</div>
							</div>
						)}
						{/* Price */}
						<ProductPrice sizes={sizes} isCard handleChange={() => {}} />
					</Link>
				</div>
				<div className='hidden group-hover:block absolute -left-[1px] bg-accent  border border-t-0  w-[calc(100%+2px)] px-4 pb-4 rounded-b-3xl shadow-xl z-30 space-y-2'>
					{/* Variant switcher */}
					<VariantSwitcher
						images={variantImages}
						variants={variants}
						setVariant={setVariant}
						selectedVariant={variant}
					/>
					{/* Action buttons */}
					<div className='flex flex-items gap-x-1'>
						<Link href={`/product/${slug}/${variantSlug}`} className='w-full'>
							<Button className='w-full flex-1 border-4 !border-border  text-main-primary dark:hover:bg-border shadow-md'>
								Add to cart
							</Button>
						</Link>

						<Button
							variant='black'
							size='icon'
							onClick={() => handleaddToWishlist()}
							className=''
						>
							<Heart className='w-5' />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
