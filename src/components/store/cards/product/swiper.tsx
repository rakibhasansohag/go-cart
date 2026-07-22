'use client';
import { ProductVariantImage } from '@prisma/client';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CYCLE_INTERVAL = 1200; // ms between slides

export default function ProductCardImageSwiper({
	images,
}: {
	images: ProductVariantImage[];
}) {
	const [index, setIndex] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const currentIndexRef = useRef(0);

	// advance uses ref so interval closure is never stale
	const advance = () => {
		const to = (currentIndexRef.current + 1) % images.length;
		currentIndexRef.current = to;
		setIndex(to);
	};

	const startCycle = () => {
		if (images.length <= 1) return;
		intervalRef.current = setInterval(advance, CYCLE_INTERVAL);
	};

	const stopCycle = () => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		currentIndexRef.current = 0;
		setIndex(0);
	};

	if (!images[index]) return null;

	return (
		<div
			onMouseEnter={startCycle}
			onMouseLeave={stopCycle}
			style={{
				position: 'relative',
				width: '100%',
				height: '240px',
				overflow: 'hidden',
				borderRadius: '1rem',
				marginBottom: '0.5rem',
				background: '#f5f5f5',
				cursor: 'pointer',
			}}
		>
			{/* Dot indicators */}
			{images.length > 1 && (
				<div
					style={{
						position: 'absolute',
						bottom: '8px',
						left: '50%',
						transform: 'translateX(-50%)',
						display: 'flex',
						gap: '4px',
						zIndex: 20,
					}}
				>
					{images.map((_, i) => (
						<span
							key={i}
							style={{
								width: '6px',
								height: '6px',
								borderRadius: '50%',
								background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
								display: 'block',
								transition: 'background 0.3s',
							}}
						/>
					))}
				</div>
			)}

			{/* Framer-motion slide animation */}
			<AnimatePresence initial={false} mode='popLayout'>
				<motion.img
					key={index}
					src={images[index].url}
					alt=''
					initial={{ x: '100%' }}
					animate={{ x: 0 }}
					exit={{ x: '-100%' }}
					transition={{
						x: {
							type: 'tween',
							duration: 0.42,
							ease: [0.25, 0.46, 0.45, 0.94],
						},
					}}
					style={{
						position: 'absolute',
						inset: 0,
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						display: 'block',
					}}
				/>
			</AnimatePresence>
		</div>
	);
}
