'use client';
import { ProductType, SimpleProduct } from '@/lib/types';
import { FC, ReactNode, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import ProductCard from '../cards/product/product-card';
import { Pagination } from 'swiper/modules';
import ProductCardSimple from '../cards/product/simple-card';
import ProductCardClean from '../cards/product/clean-card';

interface Props {
	children?: ReactNode;
	products: SimpleProduct[] | ProductType[];
	type: 'main' | 'curved' | 'simple';
	slidesPerView?: number;
	breakpoints?: { [key: number]: { slidesPerView: number } };
	spaceBetween?: number;
}

const MainSwiper: FC<Props> = ({
	products,
	type,
	breakpoints = {
		500: { slidesPerView: 2 },
		750: { slidesPerView: 3 },
		965: { slidesPerView: 4 },
		1200: { slidesPerView: 5 },
		1400: { slidesPerView: 6 },
	},
	children,
	slidesPerView = 1,
	spaceBetween = 30,
}) => {
	const [swiper, setSwiper] = useState<SwiperType | null>(null);

	return (
		<div className='group/swiper relative w-full min-w-0 p-2 sm:p-3 rounded-md'>
			{children && <div>{children}</div>}
			<Swiper
				onSwiper={setSwiper}
				modules={[Pagination]}
				spaceBetween={spaceBetween}
				slidesPerView={slidesPerView}
				breakpoints={breakpoints}
				className='w-full min-w-0'
			>
				{products.map((product, i) => (
					<SwiperSlide key={i}>
						{type === 'simple' ? (
							<ProductCardSimple product={product as SimpleProduct} />
						) : type === 'curved' ? (
							<ProductCardClean product={product as ProductType} />
						) : (
							<ProductCard product={product as ProductType} />
						)}
					</SwiperSlide>
				))}
			</Swiper>

			{products.length > 1 && (
				<>
					{/* Left Arrow */}
					<button
						type='button'
						aria-label='Previous'
						onClick={() => swiper?.slidePrev()}
						className='absolute left-1 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-8.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center opacity-0 -translate-x-2 group-hover/swiper:opacity-100 group-hover/swiper:translate-x-0 transition-all duration-300 ease-out hover:scale-110 active:scale-90 cursor-pointer group/btn'
					>
						<ChevronLeft className='size-4.5 transition-transform duration-200 group-hover/btn:-translate-x-0.5' />
					</button>

					{/* Right Arrow */}
					<button
						type='button'
						aria-label='Next'
						onClick={() => swiper?.slideNext()}
						className='absolute right-1 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-8.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center opacity-0 translate-x-2 group-hover/swiper:opacity-100 group-hover/swiper:translate-x-0 transition-all duration-300 ease-out hover:scale-110 active:scale-90 cursor-pointer group/btn'
					>
						<ChevronRight className='size-4.5 transition-transform duration-200 group-hover/btn:translate-x-0.5' />
					</button>
				</>
			)}
		</div>
	);
};

export default MainSwiper;
