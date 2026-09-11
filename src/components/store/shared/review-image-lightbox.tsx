'use client';
import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ReviewImageLightboxProps {
	images: string[];
	startIndex?: number;
	onClose: () => void;
}

export default function ReviewImageLightbox({
	images,
	startIndex = 0,
	onClose,
}: ReviewImageLightboxProps) {
	const [current, setCurrent] = useState(startIndex);

	const prev = useCallback(() => {
		setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
	}, [images.length]);

	const next = useCallback(() => {
		setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
	}, [images.length]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') prev();
			if (e.key === 'ArrowRight') next();
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);
	}, [prev, next, onClose]);

	return (
		<div
			className='fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4'
			onClick={onClose}
		>
			{/* Close */}
			<button
				className='absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors'
				onClick={onClose}
				aria-label='Close lightbox'
			>
				<X className='w-5 h-5' />
			</button>

			{/* Main image */}
			<div
				className='relative max-w-3xl w-full max-h-[80vh] flex items-center justify-center'
				onClick={(e) => e.stopPropagation()}
			>
				{images.length > 1 && (
					<button
						className='absolute left-0 -translate-x-12 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10'
						onClick={prev}
						aria-label='Previous image'
					>
						<ChevronLeft className='w-6 h-6' />
					</button>
				)}
				<div className='relative w-full max-h-[75vh] aspect-square overflow-hidden rounded-2xl'>
					<Image
						src={images[current]}
						alt={`Review image ${current + 1}`}
						fill
						className='object-contain'
						sizes='(max-width: 768px) 100vw, 768px'
					/>
				</div>
				{images.length > 1 && (
					<button
						className='absolute right-0 translate-x-12 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10'
						onClick={next}
						aria-label='Next image'
					>
						<ChevronRight className='w-6 h-6' />
					</button>
				)}
			</div>

			{/* Thumbnails */}
			{images.length > 1 && (
				<div className='absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4'>
					{images.map((src, idx) => (
						<button
							key={idx}
							onClick={(e) => {
								e.stopPropagation();
								setCurrent(idx);
							}}
							className={cn(
								'w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
								idx === current
									? 'border-emerald-400 scale-110'
									: 'border-white/20 hover:border-white/50 opacity-60 hover:opacity-100',
							)}
							aria-label={`View image ${idx + 1}`}
						>
							<Image
								src={src}
								alt={`Thumbnail ${idx + 1}`}
								width={56}
								height={56}
								className='w-full h-full object-cover'
							/>
						</button>
					))}
				</div>
			)}

			{/* Counter */}
			<span className='absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm'>
				{current + 1} / {images.length}
			</span>
		</div>
	);
}
