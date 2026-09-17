'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ShareImg from '@/public/assets/images/sideline/share.png';
import SocialShare from '../../shared/social-share';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export default function SidelineShare() {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleMouseEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setIsOpen(true);
	};

	const handleMouseLeave = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
		}
		closeTimeoutRef.current = setTimeout(() => {
			setIsOpen(false);
		}, 300); // 300ms grace period so mouse movement never drops hover
	};

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsOpen((prev) => !prev);
	};

	// Close on Escape or click outside
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false);
			}
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('mousedown', handleClickOutside);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div
			ref={containerRef}
			className='relative mt-4'
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{/* Trigger Button on the right dock */}
			<button
				type='button'
				onClick={handleClick}
				aria-label='Share this page'
				title='Share on Social Media'
				className={cn(
					'relative w-10 h-10 flex items-center justify-center transition-colors cursor-pointer',
					isOpen ? 'bg-red-600' : 'hover:bg-red-500',
				)}
			>
				<Image
					src={ShareImg}
					width={28}
					height={28}
					alt='Share'
					style={{ width: 28, height: 28 }}
				/>
			</button>

			{/* Flyout Popup */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, x: 8, scale: 0.95 }}
						animate={{ opacity: 1, x: 0, scale: 1 }}
						exit={{ opacity: 0, x: 8, scale: 0.95 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className='absolute right-full top-1/2 -translate-y-1/2 pr-3 z-50 flex items-center'
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						{/* Invisible hover bridge to eliminate the dead zone between the dock button and popup */}
						<div className='absolute -right-3 inset-y-0 w-4 pointer-events-auto' />

						{/* Content Card matching the dock flyout styling */}
						<div className='relative flex flex-col items-center gap-2 rounded-xl bg-neutral-800/95 dark:bg-slate-900/95 p-2.5 shadow-2xl border border-white/10 backdrop-blur-md'>
							<SocialShare isCol showCopy iconSize={32} />

							{/* Right-pointing arrow caret */}
							<div className='absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-neutral-800 dark:border-l-slate-900 pointer-events-none' />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
