'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Zap, Sparkles, Flame, Tag, CreditCard } from 'lucide-react';

interface OfferBannerProps {
	offer: string;
}

export default function OfferBanner({ offer }: OfferBannerProps) {
	// 24-hour target countdown for flash deals
	const [timeLeft, setTimeLeft] = useState<{
		hours: number;
		minutes: number;
		seconds: number;
	}>({ hours: 14, minutes: 28, seconds: 45 });

	useEffect(() => {
		if (offer !== 'flash-deals') return;

		const calculateRemaining = () => {
			const now = new Date();
			// Target midnight UTC
			const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
			const diff = Math.max(0, target.getTime() - now.getTime());

			const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
			const minutes = Math.floor((diff / (1000 * 60)) % 60);
			const seconds = Math.floor((diff / 1000) % 60);

			setTimeLeft({ hours, minutes, seconds });
		};

		calculateRemaining();
		const interval = setInterval(calculateRemaining, 1000);
		return () => clearInterval(interval);
	}, [offer]);

	switch (offer) {
		case 'flash-deals':
			return (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/80 via-purple-950/60 to-slate-900/80 border border-rose-500/30 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-sm'>
					<div className='absolute -right-10 -bottom-10 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none' />
					<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10'>
						<div className='space-y-1.5'>
							<div className='flex items-center gap-2'>
								<span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30'>
									<Zap className='size-3.5 fill-rose-400 text-rose-400 animate-pulse' />
									FLASH SALE
								</span>
								<span className='text-xs font-semibold text-rose-300/80'>Up to 35% OFF</span>
							</div>
							<h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
								Limited-Time Flash Deals
							</h2>
							<p className='text-xs sm:text-sm text-slate-300'>
								Deep discounts on selected gear. Prices revert when the timer strikes zero!
							</p>
						</div>

						{/* Live Countdown Box */}
						<div className='flex items-center gap-3 bg-black/40 border border-rose-500/30 rounded-xl px-4 py-2.5 shadow-inner self-start sm:self-auto'>
							<div className='flex items-center gap-1.5 text-xs text-rose-300 font-medium'>
								<Clock className='size-4 text-rose-400' />
								<span>Ends in:</span>
							</div>
							<div className='flex items-center gap-1.5 font-mono text-sm sm:text-base font-black text-white'>
								<span className='bg-slate-900/90 border border-slate-700 px-2 py-1 rounded shadow-xs'>
									{String(timeLeft.hours).padStart(2, '0')}h
								</span>
								<span className='text-rose-400 font-bold'>:</span>
								<span className='bg-slate-900/90 border border-slate-700 px-2 py-1 rounded shadow-xs'>
									{String(timeLeft.minutes).padStart(2, '0')}m
								</span>
								<span className='text-rose-400 font-bold'>:</span>
								<span className='bg-rose-600 text-white border border-rose-500 px-2 py-1 rounded shadow-xs animate-pulse'>
									{String(timeLeft.seconds).padStart(2, '0')}s
								</span>
							</div>
						</div>
					</div>
				</div>
			);

		case 'today-top-pick':
			return (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900/70 to-blue-950/70 border border-amber-500/30 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-sm'>
					<div className='flex items-center gap-2 mb-1.5'>
						<span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30'>
							<Sparkles className='size-3.5 text-amber-400' />
							DAILY PICKS
						</span>
						<span className='text-xs font-semibold text-amber-300/80'>Updated Daily</span>
					</div>
					<h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
						Today&apos;s Top Picks
					</h2>
					<p className='text-xs sm:text-sm text-slate-300 mt-1'>
						Handpicked top-rated products across all marketplace categories, curated for quality and value.
					</p>
				</div>
			);

		case 'super-deals':
			return (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-950/70 via-slate-900/70 to-red-950/70 border border-orange-500/30 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-sm'>
					<div className='flex items-center gap-2 mb-1.5'>
						<span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30'>
							<Flame className='size-3.5 text-orange-400' />
							HOT DISCOUNTS
						</span>
					</div>
					<h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
						Super Deals
					</h2>
					<p className='text-xs sm:text-sm text-slate-300 mt-1'>
						Big savings on popular products. Verified store offers with discounted rates.
					</p>
				</div>
			);

		case 'best-deals':
			return (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/70 to-teal-950/70 border border-emerald-500/30 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-sm'>
					<div className='flex items-center gap-2 mb-1.5'>
						<span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'>
							<Tag className='size-3.5 text-emerald-400' />
							VALUE SELECTION
						</span>
					</div>
					<h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
						Best Deals
					</h2>
					<p className='text-xs sm:text-sm text-slate-300 mt-1'>
						Competitive pricing across everyday essentials and tech favorites.
					</p>
				</div>
			);

		case 'featured':
			return (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900/70 to-indigo-950/70 border border-blue-500/30 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-sm'>
					<div className='flex items-center gap-2 mb-1.5'>
						<span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30'>
							<Sparkles className='size-3.5 text-blue-400' />
							FEATURED
						</span>
					</div>
					<h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
						Featured Collection
					</h2>
					<p className='text-xs sm:text-sm text-slate-300 mt-1'>
						Standout picks and flagship products selected by marketplace editors.
					</p>
				</div>
			);

		case 'user-card':
			return (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-950/70 via-slate-900/70 to-fuchsia-950/70 border border-violet-500/30 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-sm'>
					<div className='flex items-center gap-2 mb-1.5'>
						<span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30'>
							<CreditCard className='size-3.5 text-violet-400' />
							MEMBER SPECIALS
						</span>
					</div>
					<h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
						User Card Perks &amp; Deals
					</h2>
					<p className='text-xs sm:text-sm text-slate-300 mt-1'>
						Special rates and member benefits applied at checkout for active shoppers.
					</p>
				</div>
			);

		default:
			return null;
	}
}
