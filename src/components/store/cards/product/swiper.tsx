//React, Nextjs
import Image from 'next/image';

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';

// Types
import { ProductVariantImage } from '@prisma/client';
import { useRef } from 'react';

export default function ProductCardImageSwiper({
	images,
}: {
	images: ProductVariantImage[];
}) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const swiperInstanceRef = useRef<any>(null);

	return (
		<div
			className='relative mb-2 w-full h-[200px] bg-white contrast-[90%] rounded-2xl overflow-hidden'
			onMouseEnter={() => {
				if (swiperInstanceRef.current?.autoplay) {
					swiperInstanceRef.current.autoplay.start();
				}
			}}
			onMouseLeave={() => {
				if (swiperInstanceRef.current?.autoplay) {
					swiperInstanceRef.current.autoplay.stop();
					swiperInstanceRef.current.slideTo(0);
				}
			}}
		>
			<Swiper
				onSwiper={(swiper) => {
					swiperInstanceRef.current = swiper;
					if (swiper.autoplay) {
						swiper.autoplay.stop();
					}
				}}
				modules={[Autoplay]}
				autoplay={{ delay: 500, disableOnInteraction: false }}
				slidesPerView={1}
				className='w-full h-full'
			>
				{images.map((img) => (
					<SwiperSlide key={img.id} className='w-full h-full'>
						<Image
							src={img.url}
							alt=''
							width={400}
							height={400}
							className='w-full h-full object-cover'
						/>
					</SwiperSlide>
				))}
			</Swiper>
		</div>
	);
}
