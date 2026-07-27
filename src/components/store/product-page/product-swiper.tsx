'use client';

import { Dispatch, SetStateAction, useState, useEffect, MouseEvent } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductSwiper({
	images,
	activeImage,
	setActiveImage,
}: {
	images: { url: string }[];
	activeImage: { url: string } | null;
	setActiveImage: Dispatch<SetStateAction<{ url: string } | null>>;
}) {
	const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
	const [modalZoomScale, setModalZoomScale] = useState(1);
	const [hoverZoom, setHoverZoom] = useState(false);
	const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

	// Lock body scroll when Lightbox Modal is open
	useEffect(() => {
		if (isZoomModalOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isZoomModalOpen]);

	if (!images || images.length === 0) return null;

	const currentImg = activeImage || images[0];
	const currentIndex = images.findIndex((img) => img.url === currentImg.url);

	const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
		const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
		const x = ((e.clientX - left) / width) * 100;
		const y = ((e.clientY - top) / height) * 100;
		setMousePos({ x, y });
	};

	const handlePrev = () => {
		const prevIndex = (currentIndex - 1 + images.length) % images.length;
		setActiveImage(images[prevIndex]);
	};

	const handleNext = () => {
		const nextIndex = (currentIndex + 1) % images.length;
		setActiveImage(images[nextIndex]);
	};

	const openModal = () => {
		setModalZoomScale(1);
		setIsZoomModalOpen(true);
	};

	return (
		<>
			<div className='relative xl:w-[25vw] swiper1700width'>
				<div className='relative w-full flex flex-col-reverse 2xl:flex-row gap-3'>
					{/* Thumbnails */}
					<div className='flex flex-wrap 2xl:flex-col gap-2.5 shrink-0'>
						{images.map((img) => {
							const isSelected = currentImg.url === img.url;
							return (
								<div
									key={img.url}
									className={cn(
										'w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-150 relative bg-muted/30',
										isSelected
											? 'border-primary ring-2 ring-primary/20 shadow-xs scale-105'
											: 'border-border/60 hover:border-foreground/40 opacity-70 hover:opacity-100',
									)}
									onClick={() => setActiveImage(img)}
									onMouseEnter={() => setActiveImage(img)}
								>
									<Image
										src={img.url}
										alt='Thumbnail'
										fill
										sizes='64px'
										className='object-cover'
									/>
								</div>
							);
						})}
					</div>

					{/* Main Product Image Container */}
					<div
						className='relative flex-1 aspect-square rounded-2xl overflow-hidden border border-border/60 bg-muted/20 group cursor-crosshair select-none'
						onMouseEnter={() => setHoverZoom(true)}
						onMouseLeave={() => setHoverZoom(false)}
						onMouseMove={handleMouseMove}
						onClick={openModal}
					>
						{/* Base Image with Hover Zoom Scale */}
						<Image
							src={currentImg.url}
							alt='Product view'
							fill
							priority
							sizes='(max-width: 1280px) 100vw, 25vw'
							style={{
								transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
								transform: hoverZoom ? 'scale(1.75)' : 'scale(1)',
							}}
							className='object-cover transition-transform duration-150 ease-out'
						/>

						{/* Expand / Gallery Modal Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								openModal();
							}}
							className='absolute top-3 right-3 z-20 w-9 h-9 rounded-xl bg-background/80 backdrop-blur-md border border-border/60 shadow-sm flex items-center justify-center text-foreground hover:bg-background hover:scale-110 transition-all cursor-pointer opacity-80 group-hover:opacity-100'
							title='Expand image gallery modal'
						>
							<Maximize2 className='w-4 h-4' />
						</button>
					</div>
				</div>
			</div>

			{/* Fullscreen Lightbox Modal */}
			{isZoomModalOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none'>
					{/* Modal Controls Toolbar */}
					<div className='absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/60 border border-white/20 rounded-2xl p-1.5 backdrop-blur-md'>
						<button
							onClick={() => setModalZoomScale((s) => Math.min(s + 0.5, 3.5))}
							className='p-2 rounded-xl text-white hover:bg-white/20 transition-all cursor-pointer'
							title='Zoom In'
						>
							<ZoomIn className='w-5 h-5' />
						</button>
						<button
							onClick={() => setModalZoomScale((s) => Math.max(s - 0.5, 1))}
							className='p-2 rounded-xl text-white hover:bg-white/20 transition-all cursor-pointer'
							title='Zoom Out'
						>
							<ZoomOut className='w-5 h-5' />
						</button>
						<button
							onClick={() => setModalZoomScale(1)}
							className='p-2 rounded-xl text-white hover:bg-white/20 transition-all cursor-pointer'
							title='Reset Zoom'
						>
							<RotateCcw className='w-5 h-5' />
						</button>
						<div className='w-px h-5 bg-white/20 my-auto' />
						<button
							onClick={() => setIsZoomModalOpen(false)}
							className='p-2 rounded-xl text-white hover:bg-red-500/80 transition-all cursor-pointer'
							title='Close Gallery'
						>
							<X className='w-5 h-5' />
						</button>
					</div>

					{/* Navigation Prev */}
					{images.length > 1 && (
						<button
							onClick={handlePrev}
							className='absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer'
							title='Previous image'
						>
							<ChevronLeft className='w-6 h-6' />
						</button>
					)}

					{/* Clean Modal Image Viewer without scrollbars or UI shifting */}
					<div className='w-full h-full flex items-center justify-center overflow-hidden relative p-8'>
						<div
							style={{ transform: `scale(${modalZoomScale})` }}
							className='transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full'
						>
							<Image
								src={currentImg.url}
								alt='Gallery view'
								width={1400}
								height={1400}
								className='object-contain max-h-[75vh] w-auto h-auto rounded-xl shadow-2xl select-none'
							/>
						</div>
					</div>

					{/* Navigation Next */}
					{images.length > 1 && (
						<button
							onClick={handleNext}
							className='absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer'
							title='Next image'
						>
							<ChevronRight className='w-6 h-6' />
						</button>
					)}

					{/* Bottom Thumbnail Strip in Modal */}
					{images.length > 1 && (
						<div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 border border-white/20 px-3 py-2 rounded-2xl backdrop-blur-md max-w-full overflow-x-auto'>
							{images.map((img) => {
								const isSel = currentImg.url === img.url;
								return (
									<button
										key={img.url}
										onClick={() => setActiveImage(img)}
										className={cn(
											'w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative shrink-0',
											isSel ? 'border-primary scale-110' : 'border-transparent opacity-60 hover:opacity-100',
										)}
									>
										<Image
											src={img.url}
											alt='Modal thumbnail'
											fill
											className='object-cover'
										/>
									</button>
								);
							})}
						</div>
					)}
				</div>
			)}
		</>
	);
}
