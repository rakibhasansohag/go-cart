'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame, Sparkles, ChevronLeft, ChevronRight, ArrowRight, Star, TrendingUp } from 'lucide-react';
import { SimpleProduct } from '@/lib/types';
import { useCurrency } from '@/providers/currency-provider';
import { cn } from '@/lib/utils';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

export interface AnimatedDealsProps {
	products: SimpleProduct[];
	title?: string | null;
	subtitle?: string | null;
	targetDate?: string;
	badgeText?: string;
}

export default function AnimatedDeals({
	products,
	title,
	subtitle,
	targetDate,
	badgeText,
}: AnimatedDealsProps) {
	const { formatPrice } = useCurrency();

	// Stable fallback countdown target (3 days from now if not provided)
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

	const topSeller = products[0];
	const topRated = products.length > 1 ? products[products.length - 1] : products[0];
	const dealItems = products.length <= 3 ? products : products.slice(1, products.length - 1);

	return (
		<section
			aria-label='Super Deals'
			className='relative w-full rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br from-slate-950 via-zinc-900 to-black p-4 sm:p-6 shadow-2xl text-white'
		>
			{/* Ambient background glows */}
			<div className='absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none' />
			<div className='absolute -bottom-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none' />

			{/* Top Bar: Title, Live Countdown, and View All */}
			<div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10'>
				<div className='flex items-center gap-3'>
					<div className='flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 shadow-md shadow-amber-500/20'>
						<Flame className='w-5 h-5 text-white animate-pulse' />
					</div>
					<div>
						<div className='flex items-center gap-2'>
							<span className='px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full'>
								{badgeText || '⚡ Super Deals'}
							</span>
							<h2 className='text-xl sm:text-2xl font-extrabold tracking-tight text-white'>
								{title || 'Super Deals Hub'}
							</h2>
						</div>
						<p className='text-xs text-zinc-400 mt-0.5'>
							{subtitle || 'Limited-time discounts on trending store products'}
						</p>
					</div>
				</div>

				{/* Live Countdown Clock */}
				<div className='flex items-center gap-4 flex-wrap'>
					<div className='flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-sm'>
						<span className='flex h-2 w-2 relative'>
							<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75'></span>
							<span className='relative inline-flex rounded-full h-2 w-2 bg-rose-500'></span>
						</span>
						<span className='text-xs font-medium text-zinc-300 mr-1'>Ends in:</span>
						<div className='flex items-center gap-1 font-mono text-xs font-bold text-white'>
							<span className='bg-black/60 border border-white/10 px-1.5 py-0.5 rounded'>
								{String(timeLeft.days).padStart(2, '0')}d
							</span>
							<span>:</span>
							<span className='bg-black/60 border border-white/10 px-1.5 py-0.5 rounded'>
								{String(timeLeft.hours).padStart(2, '0')}h
							</span>
							<span>:</span>
							<span className='bg-black/60 border border-white/10 px-1.5 py-0.5 rounded'>
								{String(timeLeft.minutes).padStart(2, '0')}m
							</span>
							<span>:</span>
							<span className='bg-rose-600/80 border border-rose-500/40 px-1.5 py-0.5 rounded text-white'>
								{String(timeLeft.seconds).padStart(2, '0')}s
							</span>
						</div>
					</div>

					<Link
						href='/browse?offer=super-deals'
						className='inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors group'
					>
						<span>View all deals</span>
						<ArrowRight className='w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform' />
					</Link>
				</div>
			</div>

			{/* Main Content Showcase */}
			<div className='relative z-10 mt-5 grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-4 items-stretch'>
				{/* Left Feature: Top Seller Spotlight */}
				{topSeller && (
					<Link
						href={`/product/${topSeller.slug}?variant=${topSeller.variantSlug}`}
						className='group flex flex-col justify-between bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-amber-500/40 rounded-xl p-3 transition-all duration-200'
					>
						<div>
							<div className='flex items-center justify-between gap-1 mb-2'>
								<span className='inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md'>
									<TrendingUp className='w-3 h-3' />
									Top Seller
								</span>
								<span className='text-[10px] text-zinc-400'>Best Volume</span>
							</div>
							<div className='relative w-full aspect-square rounded-lg overflow-hidden bg-black/40'>
								<Image
									src={topSeller.image}
									alt={topSeller.name}
									fill
									sizes='(max-width: 768px) 100vw, 220px'
									className='object-cover group-hover:scale-105 transition-transform duration-300'
								/>
							</div>
							<h3 className='text-xs font-medium text-zinc-200 line-clamp-2 mt-2 group-hover:text-white transition-colors'>
								{topSeller.name}
							</h3>
						</div>
						<div className='mt-3 pt-2 border-t border-white/10 flex items-center justify-between'>
							<span className='text-xs text-zinc-400'>Special Deal</span>
							<span className='text-sm font-extrabold text-amber-400'>
								{formatPrice(topSeller.price || 0)}
							</span>
						</div>
					</Link>
				)}

				{/* Center: Interactive Deals Carousel */}
				<div className='relative min-w-0 bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col justify-between'>
					{dealItems.length > 0 ? (
						<div className='relative'>
							<Swiper
								modules={[Navigation]}
								navigation={{
									prevEl: '.deal-swiper-prev',
									nextEl: '.deal-swiper-next',
								}}
								spaceBetween={12}
								slidesPerView={1.3}
								breakpoints={{
									480: { slidesPerView: 2.2 },
									768: { slidesPerView: 3.2 },
									1280: { slidesPerView: 3.5 },
									1440: { slidesPerView: 4.2 },
								}}
								className='w-full !py-1'
							>
								{dealItems.map((product, idx) => {
									// Calculated discount percentage display
									const discountPct = 30 + ((idx * 7) % 35);
									const claimedPct = 55 + ((idx * 9) % 40);

									return (
										<SwiperSlide key={`${product.slug}-${product.variantSlug}-${idx}`}>
											<Link
												href={`/product/${product.slug}?variant=${product.variantSlug}`}
												className='group block bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/30 rounded-xl p-2.5 transition-all duration-200'
											>
												<div className='relative w-full aspect-square rounded-lg overflow-hidden bg-black/40'>
													<Image
														src={product.image}
														alt={product.name}
														fill
														sizes='(max-width: 768px) 50vw, 200px'
														className='object-cover group-hover:scale-105 transition-transform duration-300'
													/>
													<span className='absolute top-1.5 left-1.5 bg-rose-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-md'>
														-{discountPct}%
													</span>
												</div>
												<div className='mt-2'>
													<h4 className='text-xs font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors'>
														{product.name}
													</h4>
													<div className='flex items-baseline gap-1.5 mt-1'>
														<span className='text-sm font-bold text-white'>
															{formatPrice(product.price || 0)}
														</span>
														<span className='text-[10px] text-zinc-500 line-through'>
															{formatPrice((product.price || 0) * (1 + discountPct / 100))}
														</span>
													</div>
													{/* Claim progress meter */}
													<div className='mt-2 space-y-1'>
														<div className='flex items-center justify-between text-[10px] text-zinc-400'>
															<span>Claimed</span>
															<span className='text-rose-400 font-semibold'>{claimedPct}%</span>
														</div>
														<div className='w-full h-1.5 bg-white/10 rounded-full overflow-hidden'>
															<div
																className='h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full'
																style={{ width: `${claimedPct}%` }}
															/>
														</div>
													</div>
												</div>
											</Link>
										</SwiperSlide>
									);
								})}
							</Swiper>

							{/* Custom Navigation Arrows */}
							<button
								aria-label='Previous deal'
								className='deal-swiper-prev absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-30 disabled:pointer-events-none'
							>
								<ChevronLeft className='w-4 h-4' />
							</button>
							<button
								aria-label='Next deal'
								className='deal-swiper-next absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-30 disabled:pointer-events-none'
							>
								<ChevronRight className='w-4 h-4' />
							</button>
						</div>
					) : (
						<div className='py-8 text-center text-xs text-zinc-400'>
							Check back soon for upcoming limited-time deals.
						</div>
					)}
				</div>

				{/* Right Feature: Top Rated Spotlight */}
				{topRated && (
					<Link
						href={`/product/${topRated.slug}?variant=${topRated.variantSlug}`}
						className='group flex flex-col justify-between bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-amber-500/40 rounded-xl p-3 transition-all duration-200'
					>
						<div>
							<div className='flex items-center justify-between gap-1 mb-2'>
								<span className='inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md'>
									<Star className='w-3 h-3 fill-amber-300 text-amber-300' />
									Top Rated
								</span>
								<span className='text-[10px] text-zinc-400'>5★ Feedback</span>
							</div>
							<div className='relative w-full aspect-square rounded-lg overflow-hidden bg-black/40'>
								<Image
									src={topRated.image}
									alt={topRated.name}
									fill
									sizes='(max-width: 768px) 100vw, 220px'
									className='object-cover group-hover:scale-105 transition-transform duration-300'
								/>
							</div>
							<h3 className='text-xs font-medium text-zinc-200 line-clamp-2 mt-2 group-hover:text-white transition-colors'>
								{topRated.name}
							</h3>
						</div>
						<div className='mt-3 pt-2 border-t border-white/10 flex items-center justify-between'>
							<span className='text-xs text-zinc-400'>Special Deal</span>
							<span className='text-sm font-extrabold text-amber-400'>
								{formatPrice(topRated.price || 0)}
							</span>
						</div>
					</Link>
				)}
			</div>
		</section>
	);
}
