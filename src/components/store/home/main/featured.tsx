'use client';
import Link from 'next/link';
import MainSwiper from '../../shared/swiper';
import { SimpleProduct } from '@/lib/types';

export default function Featured({ products }: { products: SimpleProduct[] }) {
	return (
		<div className='relative rounded-2xl overflow-hidden border border-border/40 shadow-xs h-[190px]'>
			<div
				className='w-full h-full flex flex-row items-center justify-between bg-cover bg-center bg-no-repeat overflow-hidden'
				style={{ backgroundImage: 'url(/assets/images/ads/featured.webp)' }}
			>
				{/* Coupon Column */}
				<Link href='/browse' className='shrink-0 select-none h-full'>
					<div className='w-44 sm:w-56 px-3 sm:px-4 py-3 relative h-full flex flex-col justify-between'>
						{/* Reserved top header space for background image graphic */}
						<div className='h-[95px]' />

						{/* Animated Coupon Badge */}
						<div
							className='w-40 sm:w-48 h-[52px] pl-3 sm:pl-3.5 pr-8 sm:pr-11 text-left bg-contain bg-no-repeat flex flex-col justify-center shrink-0 mb-1'
							style={{ backgroundImage: 'url(/assets/images/ads/coupon.gif)' }}
						>
							<span className='text-[14px] sm:text-[16px] font-extrabold leading-tight text-slate-900'>
								use &#39;rakib&#39;
							</span>
							<span className='text-[10px] sm:text-[11px] font-bold text-slate-800'>
								for 87% off
							</span>
						</div>
					</div>
				</Link>

				{/* Product Swiper - Horizontal layout on all viewports */}
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
