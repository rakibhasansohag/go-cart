'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
	Flame,
	ChevronLeft,
	ChevronRight,
	ArrowRight,
	Star,
	ShoppingBag,
	Clock,
	Zap,
} from 'lucide-react';
import type { Swiper as SwiperType } from 'swiper';
import { SimpleProduct } from '@/lib/types';
import { DealProductItem } from '@/lib/homepage-types';
import { useCurrency } from '@/providers/currency-provider';
import { recordSectionInteraction } from '@/queries/homepage-config';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

export interface AnimatedDealsProps {
	products: (DealProductItem | SimpleProduct)[];
	title?: string | null;
	subtitle?: string | null;
	targetDate?: string;
	badgeText?: string;
}

function normalizeDeal(
	item: DealProductItem | SimpleProduct,
	index: number
): DealProductItem {
	if ('originalPrice' in item && typeof item.originalPrice === 'number') {
		return item as DealProductItem;
	}
	const basePrice = item.price || 49.99;
	const discount = 15 + ((index * 5) % 20);
	const originalPrice = Math.round((basePrice / (1 - discount / 100)) * 100) / 100;
	return {
		id: item.slug || `deal-${index}`,
		name: item.name,
		slug: item.slug,
		variantSlug: item.variantSlug || item.slug,
		image: item.image,
		price: basePrice,
		originalPrice,
		discount,
		rating: 4.8,
		sales: 30 + index * 8,
		claimedPercent: Math.min(95, Math.max(48, 55 + ((index * 7) % 35))),
	};
}

export default function AnimatedDeals({
	products,
	title,
	subtitle,
	targetDate,
	badgeText,
}: AnimatedDealsProps) {
	const { formatPrice } = useCurrency();
	const [swiper, setSwiper] = useState<SwiperType | null>(null);
	const [isBeginning, setIsBeginning] = useState(true);
	const [isEnd, setIsEnd] = useState(false);

	const resolvedTargetDate = useMemo(() => {
		if (targetDate) return targetDate;
		const fallback = Date.now() + 3 * 24 * 60 * 60 * 1000;
		return new Date(fallback).toISOString();
	}, [targetDate]);

	const [timeLeft, setTimeLeft] = useState({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});

	useEffect(() => {
		const targetTime = new Date(resolvedTargetDate).getTime();
		const calculate = () => {
			const now = Date.now();
			const diff = Math.max(0, targetTime - now);
			setTimeLeft({
				days: Math.floor(diff / (1000 * 60 * 60 * 24)),
				hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
				minutes: Math.floor((diff / (1000 * 60)) % 60),
				seconds: Math.floor((diff / 1000) % 60),
			});
		};
		calculate();
		const interval = setInterval(calculate, 1000);
		return () => clearInterval(interval);
	}, [resolvedTargetDate]);

	// Strict deduplication by normalized name and key
	const uniqueProducts = useMemo(() => {
		const seenNames = new Set<string>();
		const seenKeys = new Set<string>();
		const result: DealProductItem[] = [];

		for (let i = 0; i < products.length; i++) {
			const item = normalizeDeal(products[i], i);
			const nameKey = item.name.trim().toLowerCase();
			const primaryKey = (item.slug || item.id || `item-${i}`).trim().toLowerCase();

			if (!seenNames.has(nameKey) && !seenKeys.has(primaryKey)) {
				seenNames.add(nameKey);
				seenKeys.add(primaryKey);
				result.push(item);
			}
		}
		return result;
	}, [products]);

	const maxDiscount = useMemo(() => {
		if (uniqueProducts.length === 0) return 15;
		return Math.max(...uniqueProducts.map((p) => p.discount));
	}, [uniqueProducts]);

	const handlePrev = () => {
		if (!swiper) return;
		if (swiper.isBeginning) {
			swiper.slideTo(uniqueProducts.length - 1);
		} else {
			swiper.slidePrev();
		}
	};

	const handleNext = () => {
		if (!swiper) return;
		if (swiper.isEnd) {
			swiper.slideTo(0);
		} else {
			swiper.slideNext();
		}
	};

	if (uniqueProducts.length === 0) {
		return null;
	}

	return (
		<section
			aria-label="Super Deals"
			className="relative w-full rounded-2xl border border-border/80 bg-card text-card-foreground p-4 sm:p-5 shadow-xs overflow-hidden"
		>
			{/* Ambient background glows */}
			<div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-20 -right-20 w-64 h-64 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

			{/* Header Bar */}
			<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-3.5 border-b border-border/70">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 shadow-xs text-white shrink-0">
						<Flame className="size-4.5 animate-pulse" />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full flex items-center gap-1">
								<Zap className="size-3" />
								{badgeText || 'Flash Sale'}
							</span>
							<h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
								{title || 'Super Deals Hub'}
							</h2>
							<span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
								{uniqueProducts.length} Deals Live • Up to {maxDiscount}% OFF
							</span>
						</div>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							{subtitle || 'Limited-time discounts on top products'}
						</p>
					</div>
				</div>

				{/* Header Actions: Countdown Timer + Header Arrows + View All Link */}
				<div className="flex items-center gap-3 sm:gap-4 flex-wrap">
					{/* Live Countdown */}
					<div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-xl px-2.5 py-1 shadow-xs">
						<span className="flex size-2 relative">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
							<span className="relative inline-flex rounded-full size-2 bg-rose-500" />
						</span>
						<span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
							<Clock className="size-3 text-amber-500" />
							Ends in:
						</span>
						<div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
							<span className="bg-background border border-border px-1.5 py-0.5 rounded shadow-xs">
								{String(timeLeft.days).padStart(2, '0')}d
							</span>
							<span className="text-muted-foreground">:</span>
							<span className="bg-background border border-border px-1.5 py-0.5 rounded shadow-xs">
								{String(timeLeft.hours).padStart(2, '0')}h
							</span>
							<span className="text-muted-foreground">:</span>
							<span className="bg-background border border-border px-1.5 py-0.5 rounded shadow-xs">
								{String(timeLeft.minutes).padStart(2, '0')}m
							</span>
							<span className="text-muted-foreground">:</span>
							<span className="bg-rose-600 text-white border border-rose-500 px-1.5 py-0.5 rounded shadow-xs animate-pulse">
								{String(timeLeft.seconds).padStart(2, '0')}s
							</span>
						</div>
					</div>

					{/* Header Navigation Arrows */}
					<div className="hidden sm:flex items-center gap-1">
						<button
							type="button"
							aria-label="Previous deal"
							onClick={handlePrev}
							className="size-8 rounded-lg bg-muted/80 hover:bg-primary hover:text-primary-foreground text-foreground border border-border flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-90 cursor-pointer shadow-xs group/prev"
						>
							<ChevronLeft className="size-4 transition-transform duration-150 group-hover/prev:-translate-x-0.5" />
						</button>
						<button
							type="button"
							aria-label="Next deal"
							onClick={handleNext}
							className="size-8 rounded-lg bg-muted/80 hover:bg-primary hover:text-primary-foreground text-foreground border border-border flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-90 cursor-pointer shadow-xs group/next"
						>
							<ChevronRight className="size-4 transition-transform duration-150 group-hover/next:translate-x-0.5" />
						</button>
					</div>

					<Link
						href="/browse?offer=super-deals"
						className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
					>
						<span>View all deals</span>
						<ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
					</Link>
				</div>
			</div>

			{/* Main Carousel Showcase */}
			<div className="relative z-10 mt-4">
				<div className="relative group/carousel">
					<Swiper
						onSwiper={(s) => {
							setSwiper(s);
							setIsBeginning(s.isBeginning);
							setIsEnd(s.isEnd);
						}}
						onSlideChange={(s) => {
							setIsBeginning(s.isBeginning);
							setIsEnd(s.isEnd);
						}}
						spaceBetween={14}
						slidesPerView={1}
						breakpoints={{
							480: { slidesPerView: 2, spaceBetween: 12 },
							640: { slidesPerView: 3, spaceBetween: 12 },
							1024: { slidesPerView: 4, spaceBetween: 14 },
							1280: { slidesPerView: 5, spaceBetween: 16 },
							1536: { slidesPerView: 6, spaceBetween: 16 },
						}}
						className="w-full !px-8 sm:!px-11 !py-1"
					>
						{uniqueProducts.map((product, idx) => (
							<SwiperSlide key={`${product.slug}-${product.variantSlug}-${idx}`} className="!h-auto">
								<div className="group/card relative w-full h-full rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-lg p-3 flex flex-col justify-between transition-all duration-300">
									{/* Top Part: Image + Badges + Rating + Title */}
									<div className="w-full min-w-0 overflow-hidden">
										{/* Uniform Image Container: fixed height with equal ratio */}
										<div className="relative w-full h-36 sm:h-38 rounded-lg overflow-hidden bg-muted/40 dark:bg-muted/20 border border-border/40 flex items-center justify-center">
											<Image
												src={product.image}
												alt={product.name}
												fill
												sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 220px"
												className="object-contain p-2 group-hover/card:scale-105 transition-transform duration-300"
											/>
											{/* Discount Tag */}
											<span className="absolute top-1.5 left-1.5 bg-rose-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-xs">
												-{product.discount}% OFF
											</span>
											{/* Top Deal Tag on First Card */}
											{idx === 0 && (
												<span className="absolute top-1.5 right-1.5 bg-amber-500 text-black font-bold text-[9px] px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
													<Flame className="size-2.5" />
													Top Deal
												</span>
											)}
										</div>

										{/* Rating & Sales count */}
										<div className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold h-4 mt-2">
											<Star className="size-3 fill-amber-500 text-amber-500" />
											<span>{product.rating.toFixed(1)}</span>
											<span className="text-muted-foreground font-normal">
												({product.sales} sold)
											</span>
										</div>

										{/* Title with fixed 2-line height for aligned baseline */}
										<h3 className="text-xs sm:text-[13px] font-semibold text-foreground line-clamp-2 h-9 min-h-[2.25rem] leading-snug group-hover/card:text-primary transition-colors mt-0.5 w-full min-w-0 break-words">
											{product.name}
										</h3>
									</div>

									{/* Bottom Part: Divider + Price + Claim Meter + Action Button */}
									<div className="mt-2.5 pt-2 border-t border-border/60 flex flex-col gap-2">
										{/* Price & Savings */}
										<div className="flex flex-col gap-0.5">
											<div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
												<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tracking-tight">
													{formatPrice(product.price)}
												</span>
												<span className="text-[11px] text-muted-foreground line-through font-mono">
													{formatPrice(product.originalPrice)}
												</span>
											</div>
											<div className="flex items-center justify-between text-[9px] gap-1">
												<span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0">
													Save {formatPrice(product.originalPrice - product.price)}
												</span>
												<span className="text-rose-600 dark:text-rose-400 font-medium shrink-0">
													Only a few left!
												</span>
											</div>
										</div>

										{/* Stock Claim Meter */}
										<div className="space-y-0.5">
											<div className="flex items-center justify-between text-[9px] text-muted-foreground">
												<span>Claimed {product.claimedPercent}%</span>
											</div>
											<div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
													style={{ width: `${product.claimedPercent}%` }}
												/>
											</div>
										</div>

										{/* Action Button with Interaction Tracking */}
										<Link
											href={`/product/${product.slug}?variant=${product.variantSlug}`}
											onClick={() => {
												recordSectionInteraction('SUPER_DEALS', product.id, 'click');
											}}
											className="w-full h-7.5 rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.97] text-primary-foreground font-semibold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all duration-150 group/btn"
										>
											<ShoppingBag className="size-3 transition-transform group-hover/btn:scale-110" />
											Claim Deal
										</Link>
									</div>
								</div>
							</SwiperSlide>
						))}
					</Swiper>

					{/* Previous Navigation Button */}
					<button
						type="button"
						aria-label="Previous deals"
						onClick={handlePrev}
						className="absolute left-0.5 sm:left-1 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-card/95 backdrop-blur-md text-foreground border border-border/80 shadow-md flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:ring-2 hover:ring-primary/30 active:scale-85 active:bg-primary/90 cursor-pointer group"
					>
						<ChevronLeft className="size-4 sm:size-5 transition-transform duration-200 group-hover:-translate-x-0.5 group-active:-translate-x-1" />
					</button>

					{/* Next Navigation Button */}
					<button
						type="button"
						aria-label="Next deals"
						onClick={handleNext}
						className="absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-card/95 backdrop-blur-md text-foreground border border-border/80 shadow-md flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:ring-2 hover:ring-primary/30 active:scale-85 active:bg-primary/90 cursor-pointer group"
					>
						<ChevronRight className="size-4 sm:size-5 transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-1" />
					</button>
				</div>
			</div>
		</section>
	);
}
