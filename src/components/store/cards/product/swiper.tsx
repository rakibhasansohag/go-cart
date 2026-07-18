'use client';
// React, Nextjs
import Image from 'next/image';

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Types
import { ProductVariantImage } from '@prisma/client';
import { useRef } from 'react';

export default function ProductCardImageSwiper({
	images,
}: {
	images: ProductVariantImage[];
}) {
	const swiperInstanceRef = useRef<SwiperType | null>(null);

	return (
		<div
			style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden', borderRadius: '1rem', marginBottom: '0.5rem', background: 'white' }}
			onMouseEnter={() => swiperInstanceRef.current?.autoplay?.start()}
			onMouseLeave={() => {
				swiperInstanceRef.current?.autoplay?.stop();
				swiperInstanceRef.current?.slideTo(0);
			}}
		>
			<Swiper
				onSwiper={(swiper) => {
					swiperInstanceRef.current = swiper;
					swiper.autoplay?.stop();
				}}
				modules={[Autoplay]}
				autoplay={{ delay: 600, disableOnInteraction: false }}
				slidesPerView={1}
				loop={images.length > 1}
				style={{ width: '100%', height: '200px' }}
			>
				{images.map((img) => (
					<SwiperSlide key={img.id} style={{ width: '100%', height: '200px', flexShrink: 0, overflow: 'hidden' }}>
					<img
						src={img.url}
						alt=''
						style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
					/>
				</SwiperSlide>
				))}
			</Swiper>
		</div>
	);
}
