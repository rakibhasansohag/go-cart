'use client';
import Link from 'next/link';
import MainSwiper from '../../shared/swiper';
import { SimpleProduct } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';

export default function Featured({ products }: { products: SimpleProduct[] }) {
	const is1170px = useMediaQuery({ query: '(min-width: 1170px)' });
	const is1700px = useMediaQuery({ query: '(min-width: 1700px)' });

	// State to store the current width of the screen
	const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(window.innerWidth);
		};

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return (
		<div className='relative rounded-2xl overflow-hidden border border-border/40 shadow-xs'>
			<div
				className='w-full flex items-center bg-cover bg-center bg-no-repeat min-h-[190px]'
				style={{ backgroundImage: 'url(/assets/images/ads/featured.webp)' }}
			>
				{/* Coupon Column */}
				<Link href='/browse' className='shrink-0'>
					<div className='w-56 px-4 py-3 relative h-47.5 flex flex-col justify-between select-none'>
						{/* Reserved top header space for background image graphic */}
						<div className='h-23.75' />

						{/* Animated Coupon Badge */}
						<div
							className='w-48 h-13 pl-3.5 pr-11 text-left bg-contain bg-no-repeat flex flex-col justify-center shrink-0 mb-1'
							style={{ backgroundImage: 'url(/assets/images/ads/coupon.gif)' }}
						>
							<span className='text-[16px] font-extrabold leading-tight text-slate-900'>
								use &#39;rakib&#39;
							</span>
							<span className='text-[11px] font-bold text-slate-800'>
								for 87% off
							</span>
						</div>
					</div>
				</Link>

				{/* Product Swiper */}
				<div
					className={is1700px ? 'ml-6' : ''}
					style={{
						width: !is1170px
							? `${screenWidth - 320}px`
							: is1700px
								? '750px'
								: `calc(500px + 5vw)`,
					}}
				>
					<MainSwiper
						products={products}
						type='simple'
						slidesPerView={1}
						spaceBetween={-10}
					/>
				</div>
			</div>
		</div>
	);
}
