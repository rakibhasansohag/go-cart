'use client';

import MainSwiper from '../../shared/swiper';
import { SimpleProduct } from '@/lib/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

interface Props {
	products: SimpleProduct[];
	couponCode?: string;
	discount?: number;
}

export default function Featured({
	products,
	couponCode = 'RAKIB',
	discount = 87,
}: Props) {
	const [isCollected, setIsCollected] = useState(false);

	useEffect(() => {
		try {
			const saved = localStorage.getItem('collected_coupons');
			if (saved) {
				const list = JSON.parse(saved);
				if (Array.isArray(list) && list.includes(couponCode)) {
					setIsCollected(true);
				}
			}
		} catch (e) {
			/* ignore */
		}
	}, [couponCode]);

	const handleCollectCoupon = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			navigator.clipboard.writeText(couponCode);
			const saved = localStorage.getItem('collected_coupons');
			const list = saved ? JSON.parse(saved) : [];
			if (!list.includes(couponCode)) {
				list.push(couponCode);
				localStorage.setItem('collected_coupons', JSON.stringify(list));
			}
			setIsCollected(true);
			toast.success(
				`Coupon '${couponCode}' (${discount}% OFF) collected! Code copied to clipboard.`,
			);
		} catch (err) {
			toast.success(`Coupon code '${couponCode}' (${discount}% OFF)`);
		}
	};

	return (
		<div className='relative rounded-2xl overflow-hidden border border-border/40 shadow-xs h-[190px]'>
			<div
				className='w-full h-full flex flex-row items-center justify-between bg-cover bg-center bg-no-repeat overflow-hidden'
				style={{ backgroundImage: 'url(/assets/images/ads/featured.webp)' }}
			>
				{/* Coupon Column - Interactive Collect / Copy Coupon */}
				<div
					onClick={handleCollectCoupon}
					className='shrink-0 select-none h-full cursor-pointer group'
				>
					<div className='w-44 sm:w-56 px-3 sm:px-4 py-3 relative h-full flex flex-col justify-between'>
						{/* Reserved top header space for background image graphic */}
						<div className='h-[95px]' />

						{/* Animated Coupon Badge */}
						<div
							className='w-40 sm:w-48 h-[52px] pl-3 sm:pl-3.5 pr-8 sm:pr-11 text-left bg-contain bg-no-repeat flex flex-col justify-center shrink-0 mb-1 group-hover:scale-105 transition-transform duration-200'
							style={{ backgroundImage: 'url(/assets/images/ads/coupon.gif)' }}
						>
							{isCollected ? (
								<div className='flex items-center gap-1 text-emerald-800 font-extrabold text-[12px] sm:text-[13px] leading-tight'>
									<Check className='w-4 h-4 stroke-[3] text-emerald-700' />
									<span>COLLECTED</span>
								</div>
							) : (
								<>
									<span className='text-[14px] sm:text-[16px] font-extrabold leading-tight text-slate-900'>
										use &#39;{couponCode.toLowerCase()}&#39;
									</span>
									<span className='text-[10px] sm:text-[11px] font-bold text-slate-800'>
										for {discount}% off
									</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Product Swiper */}
				<div className='flex-1 h-full max-w-full overflow-hidden flex items-center pr-2 sm:pr-4'>
					<MainSwiper
						products={products}
						type='simple'
						slidesPerView={1}
						breakpoints={{
							360: { slidesPerView: 2 },
							540: { slidesPerView: 3 },
							768: { slidesPerView: 4 },
							1024: { slidesPerView: 5 },
							1280: { slidesPerView: 6 },
						}}
						spaceBetween={10}
					/>
				</div>
			</div>
		</div>
	);
}
