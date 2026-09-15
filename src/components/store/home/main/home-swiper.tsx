'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import Img1 from '@/public/assets/images/swiper/1.webp';
import Img2 from '@/public/assets/images/swiper/2.webp';
import Img3 from '@/public/assets/images/swiper/3.webp';
import Img4 from '@/public/assets/images/swiper/4.webp';

const images = [
	{
		id: 1,
		url: Img1,
		alt: 'Winter Adventure Wear Banner 1',
	},
	{
		id: 2,
		url: Img2,
		alt: 'Winter Adventure Wear Banner 2',
	},
	{
		id: 3,
		url: Img3,
		alt: 'Winter Adventure Wear Banner 3',
	},
	{
		id: 4,
		url: Img4,
		alt: 'Winter Adventure Wear Banner 4',
	},
];

export default function HomeMainSwiper() {
	const [swiper, setSwiper] = useState<SwiperType | null>(null);

	const handlePrev = () => {
		if (!swiper) return;
		swiper.slidePrev();
	};

	const handleNext = () => {
		if (!swiper) return;
		swiper.slideNext();
	};

	return (
		<div className='group relative w-full min-w-0 overflow-hidden rounded-md'>
			<Swiper
				onSwiper={setSwiper}
				modules={[Autoplay, Pagination, EffectFade]}
				effect='fade'
				fadeEffect={{ crossFade: true }}
				autoplay={{
					delay: 6000,
					disableOnInteraction: false,
				}}
				pagination={{
					clickable: true,
				}}
				loop={true}
				className='w-full min-w-0 rounded-md'
			>
				{images.map((img, index) => (
					<SwiperSlide key={img.id} className='rounded-md overflow-hidden'>
						<Image
							src={img.url}
							alt={img.alt}
							className='w-full h-auto object-cover rounded-md'
							priority={index === 0}
							loading={index === 0 ? 'eager' : 'lazy'}
						/>
					</SwiperSlide>
				))}
			</Swiper>

			{/* Left Navigation Arrow */}
			<button
				type='button'
				aria-label='Previous slide'
				onClick={handlePrev}
				className='absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 size-9 sm:size-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer group/btn'
			>
				<ChevronLeft className='size-5 transition-transform duration-200 group-hover/btn:-translate-x-0.5' />
			</button>

			{/* Right Navigation Arrow */}
			<button
				type='button'
				aria-label='Next slide'
				onClick={handleNext}
				className='absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 size-9 sm:size-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer group/btn'
			>
				<ChevronRight className='size-5 transition-transform duration-200 group-hover/btn:translate-x-0.5' />
			</button>
		</div>
	);
}
