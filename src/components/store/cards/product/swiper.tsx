'use client';

import { ProductVariantImage } from '@prisma/client';
import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';

const CYCLE_INTERVAL = 1200; // ms between slides

export default function ProductCardImageSwiper({
	images,
}: {
	images?: ProductVariantImage[] | null;
}) {
	const safeImages = images?.filter((image) => image.url?.trim()) ?? [];
	const [index, setIndex] = useState(0);
	const [isLoaded, setIsLoaded] = useState(false);
	const loadedUrlsRef = useRef<Set<string>>(new Set());
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const currentIndexRef = useRef(0);

	const currentUrl = safeImages[index]?.url;

	useEffect(() => {
		if (currentUrl && loadedUrlsRef.current.has(currentUrl)) {
			setIsLoaded(true);
		} else {
			setIsLoaded(false);
		}
	}, [currentUrl]);

	const handleImageLoad = () => {
		if (currentUrl) {
			loadedUrlsRef.current.add(currentUrl);
		}
		setIsLoaded(true);
	};

	const advance = () => {
		const to = (currentIndexRef.current + 1) % safeImages.length;
		currentIndexRef.current = to;
		setIndex(to);
	};

	const startCycle = () => {
		if (safeImages.length <= 1) return;
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

	if (!safeImages.length) {
		return (
			<div className='relative w-full h-[240px] overflow-hidden rounded-2xl mb-2 bg-muted/40 dark:bg-slate-800/40 border border-border/50 flex flex-col items-center justify-center gap-2 text-muted-foreground'>
				<ImageIcon className='w-10 h-10 opacity-45' aria-hidden='true' />
				<span className='text-xs'>Image unavailable</span>
			</div>
		);
	}

	return (
		<div
			onMouseEnter={startCycle}
			onMouseLeave={stopCycle}
			className='relative w-full h-[240px] overflow-hidden rounded-2xl mb-2 bg-muted/40 dark:bg-slate-800/40 cursor-pointer select-none'
		>
			{/* Skeleton loader overlay while image is loading */}
			{!isLoaded && (
				<div className='absolute inset-0 z-10 bg-muted/70 dark:bg-slate-800/70 animate-pulse flex items-center justify-center rounded-2xl'>
					<ImageIcon className='w-7 h-7 text-muted-foreground/30 animate-pulse' />
				</div>
			)}

			{/* Dot indicators */}
				{safeImages.length > 1 && (
				<div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20'>
						{safeImages.map((_, i) => (
						<span
							key={i}
							className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
								i === index ? 'bg-white scale-110 shadow-xs' : 'bg-white/40'
							}`}
						/>
					))}
				</div>
			)}

			{/* Framer-motion slide animation */}
			<AnimatePresence initial={false} mode='popLayout'>
				<motion.img
					key={currentUrl || index}
					src={currentUrl}
					alt=''
					onLoad={handleImageLoad}
					initial={{ opacity: 0, x: '50%' }}
					animate={{ opacity: isLoaded ? 1 : 0, x: 0 }}
					exit={{ opacity: 0, x: '-50%' }}
					transition={{
						x: {
							type: 'tween',
							duration: 0.35,
							ease: [0.25, 0.46, 0.45, 0.94],
						},
						opacity: { duration: 0.2 },
					}}
					className='absolute inset-0 w-full h-full object-cover block'
				/>
			</AnimatePresence>
		</div>
	);
}
