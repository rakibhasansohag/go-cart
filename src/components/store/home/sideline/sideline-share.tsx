'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import SocialShare from '../../shared/social-share';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
		}, 300);
	};

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsOpen((prev) => !prev);
	};

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
			className='relative'
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<Tooltip open={isOpen ? false : undefined}>
				<TooltipTrigger asChild>
					<button
						type='button'
						onClick={handleClick}
						aria-label='Share this page'
						className={cn(
							'relative flex items-center justify-center size-9 rounded-xl transition-all duration-200 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
							isOpen
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground hover:bg-accent/80',
						)}
					>
						<Share2 className='size-4.5 transition-transform duration-200 group-hover:scale-110' />
					</button>
				</TooltipTrigger>
				<TooltipContent side='left' sideOffset={10} className='font-medium text-xs'>
					Share Page
				</TooltipContent>
			</Tooltip>

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
						<div className='absolute -right-3 inset-y-0 w-4 pointer-events-auto' />
						<div className='relative flex flex-col items-center gap-2 rounded-xl bg-card/95 dark:bg-slate-900/95 p-3 shadow-xl border border-border backdrop-blur-md'>
							<SocialShare isCol showCopy iconSize={28} />
							<div className='absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-border pointer-events-none' />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
