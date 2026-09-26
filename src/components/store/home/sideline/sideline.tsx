'use client';

import React, { useState, useEffect } from 'react';
import {
	Gift,
	Ticket,
	Heart,
	Clock,
	MessageSquareText,
	ChevronRight,
	ChevronLeft,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SidelineItem from './item';
import SidelineShare from './sideline-share';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Sideline() {
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		try {
			const saved = localStorage.getItem('gocart_sideline_collapsed');
			if (saved !== null) {
				setIsCollapsed(saved === 'true');
			} else if (window.innerWidth < 768) {
				setIsCollapsed(true);
			}
		} catch {
			// ignore local storage error in restricted environments
		}
	}, []);

	const handleToggleCollapse = (collapsed: boolean) => {
		setIsCollapsed(collapsed);
		try {
			localStorage.setItem('gocart_sideline_collapsed', String(collapsed));
		} catch {
			// ignore
		}
	};

	return (
		<aside aria-label='Quick actions menu'>
			<AnimatePresence mode='wait'>
				{isCollapsed ? (
					<motion.div
						key='collapsed-trigger'
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 20 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
						className='fixed right-0 top-1/2 -translate-y-1/2 z-40 flex'
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type='button'
									onClick={() => handleToggleCollapse(false)}
									aria-label='Open quick shortcuts'
									className='flex items-center justify-center py-3.5 px-1.5 rounded-l-xl bg-card/90 dark:bg-card/95 backdrop-blur-md border-l border-y border-border/80 shadow-md text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
								>
									<ChevronLeft className='size-4 transition-transform duration-200 group-hover:-translate-x-0.5' />
								</button>
							</TooltipTrigger>
							<TooltipContent side='left' sideOffset={10} className='font-medium text-xs'>
								Quick shortcuts
							</TooltipContent>
						</Tooltip>
					</motion.div>
				) : (
					<motion.div
						key='floating-pill'
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 20 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
						className='fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 p-1.5 rounded-l-2xl border-l border-y border-r-0 bg-card/90 dark:bg-card/95 backdrop-blur-md border-border/80 shadow-xl ring-1 ring-black/5 dark:ring-white/10'
					>
						<SidelineItem
							link='/profile'
							label='Check Profile & Rewards'
							icon={Gift}
						/>
						<SidelineItem
							link='/profile'
							label='Coupons & Discounts'
							icon={Ticket}
						/>
						<SidelineItem
							link='/profile/wishlist'
							label='My Wishlist'
							icon={Heart}
						/>
						<SidelineItem
							link='/profile/history'
							label='Browsing History'
							icon={Clock}
						/>

						<div className='w-5 h-px bg-border/60 my-0.5' />

						<SidelineShare />

						<SidelineItem
							link='/feedback'
							label='Send Feedback'
							icon={MessageSquareText}
						/>

						<div className='w-5 h-px bg-border/60 my-0.5' />

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type='button'
									onClick={() => handleToggleCollapse(true)}
									aria-label='Collapse quick menu'
									className='relative flex items-center justify-center size-9 rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-accent/70 transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
								>
									<ChevronRight className='size-4' />
								</button>
							</TooltipTrigger>
							<TooltipContent side='left' sideOffset={10} className='font-medium text-xs'>
								Collapse dock
							</TooltipContent>
						</Tooltip>
					</motion.div>
				)}
			</AnimatePresence>
		</aside>
	);
}
