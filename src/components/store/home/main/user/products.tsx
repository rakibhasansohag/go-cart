'use client';

import { useState } from 'react';
import Image from '@/components/store/shared/catalog-image';
import Link from 'next/link';
import { SimpleProduct } from '@/lib/types';
import { useCurrency } from '@/providers/currency-provider';
import { cn } from '@/lib/utils';

export default function UserCardProducts({
	products,
}: {
	products: SimpleProduct[];
}) {
	const { formatPrice } = useCurrency();
	const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
	const [batchIndex, setBatchIndex] = useState(0);

	if (!products || products.length === 0) return null;

	const VISIBLE_COUNT = 5;
	const totalProducts = products.length;
	const startIndex = batchIndex * VISIBLE_COUNT;
	const visibleProducts = products.slice(
		startIndex,
		Math.min(startIndex + VISIBLE_COUNT, totalProducts),
	);

	const hasRemaining = totalProducts > VISIBLE_COUNT;
	const remainingCount = totalProducts - (startIndex + visibleProducts.length);

	const minPrice = products.reduce(
		(min, p) => (p.price && p.price < min ? p.price : min),
		products[0]?.price || 0,
	);

	const activeProduct = hoveredIdx !== null ? visibleProducts[hoveredIdx] : null;

	const handleCycle = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		const nextBatch =
			(batchIndex + 1) * VISIBLE_COUNT >= totalProducts ? 0 : batchIndex + 1;
		setBatchIndex(nextBatch);
		setHoveredIdx(null);
	};

	return (
		<div className='w-full flex flex-col gap-2 pt-1 select-none'>
			{/* Unified Deal Preview Banner (stays strictly inside container, never clips) */}
			<div className='relative w-full px-1'>
				<div className='w-full h-8 px-2.5 rounded-xl bg-neutral-950/85 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-between transition-all duration-200'>
					<div className='flex items-center gap-2 min-w-0 flex-1'>
						{activeProduct ? (
							<span
								className='text-xs font-semibold text-white truncate'
								title={activeProduct.name}
							>
								{activeProduct.name}
							</span>
						) : (
							<span className='text-xs font-medium text-white/90 flex items-center gap-1.5'>
								<span className='size-2 rounded-full bg-red-500 animate-pulse' />
								Deals from
							</span>
						)}
					</div>
					<div className='flex items-center gap-2 flex-shrink-0 ml-2'>
						<span className='px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-[11px] leading-tight shadow-sm whitespace-nowrap'>
							{formatPrice((activeProduct ? activeProduct.price : minPrice) || 0)}
						</span>
						{!activeProduct && (
							<span className='text-[10px] text-white/70 font-medium'>
								{totalProducts} deals
							</span>
						)}
					</div>
				</div>

				{/* Downward pointer caret targeting active avatar */}
				{hoveredIdx !== null && (
					<div
						className='absolute -bottom-1 z-30 transition-all duration-150 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-950/85 pointer-events-none'
						style={{
							left: `${hoveredIdx * 34.5 + 28}px`,
						}}
					/>
				)}
			</div>

			{/* Avatar-Group Stack (stays in overlapping stack, no expansion) */}
			<div className='relative w-full flex items-center justify-start px-1 py-0.5'>
				<div className='flex items-center -space-x-3.5'>
					{visibleProducts.map((product, i) => {
						const isHovered = hoveredIdx === i;
						const zIndex = isHovered ? 40 : 20 - i;
						const productUrl = product.variantSlug
							? `/product/${product.slug}?variant=${product.variantSlug}`
							: `/product/${product.slug}`;

						return (
							<Link
								key={product.slug + i}
								href={productUrl}
								onMouseEnter={() => setHoveredIdx(i)}
								onMouseLeave={() => setHoveredIdx(null)}
								className={cn(
									'relative group/avatar inline-block rounded-full transition-all duration-200 ease-out',
									isHovered
										? 'scale-115 -translate-y-1.5 z-40'
										: 'hover:scale-105 hover:-translate-y-0.5',
								)}
								style={{ zIndex }}
							>
								{/* Circular Avatar */}
								<div
									className={cn(
										'relative size-12 rounded-full overflow-hidden bg-white dark:bg-neutral-900 ring-2 transition-all duration-200',
										isHovered
											? 'ring-orange-500 shadow-lg shadow-orange-500/25 ring-offset-2 ring-offset-orange-100 dark:ring-offset-neutral-900'
											: 'ring-white/95 dark:ring-white/80 shadow-md shadow-black/15',
									)}
								>
									<Image
										src={product.image}
										alt={product.name}
										fill
										sizes='48px'
										className='object-cover'
									/>
								</div>
							</Link>
						);
					})}

					{/* Circular "+N" avatar bubble at end of group */}
					{hasRemaining && (
						<button
							type='button'
							onClick={handleCycle}
							title={
								remainingCount > 0
									? `+${remainingCount} more deals`
									: 'Back to first deals'
							}
							className='relative size-12 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold ring-2 ring-white/95 dark:ring-neutral-800 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer z-10 backdrop-blur-sm'
						>
							{remainingCount > 0 ? `+${remainingCount}` : `↺`}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
