'use client';

import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
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
	return (
		<div className='w-full overflow-hidden rounded-md'>
			<Swiper
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
				className='w-full rounded-md'
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
		</div>
	);
}
