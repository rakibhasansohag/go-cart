'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductSort from './sort';

interface BrowseLayoutClientProps {
	filters: React.ReactNode;
	children: React.ReactNode;
}

// Media query hook to detect viewport width client-side
function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const media = window.matchMedia(query);
		if (media.matches !== matches) {
			setMatches(media.matches);
		}
		const listener = () => setMatches(media.matches);
		media.addEventListener('change', listener);
		return () => media.removeEventListener('change', listener);
	}, [matches, query]);

	return matches;
}

export default function BrowseLayoutClient({
	filters,
	children,
}: BrowseLayoutClientProps) {
	const isDesktop = useMediaQuery('(min-width: 1024px)');
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	// Sync sidebar open state with desktop viewport change
	useEffect(() => {
		if (isDesktop) {
			setIsSidebarOpen(true);
		} else {
			setIsSidebarOpen(false);
		}
	}, [isDesktop]);

	return (
		<div className='flex relative bg-background w-full min-h-screen'>
			<AnimatePresence>
				{/* Mobile Drawer Backdrop overlay */}
				{!isDesktop && isSidebarOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setIsSidebarOpen(false)}
						className='fixed inset-0 bg-black/60 backdrop-blur-sm z-40'
					/>
				)}
			</AnimatePresence>

			{/* Collapsible Sidebar (Desktop Inline / Mobile Drawer Sheet) */}
			{isDesktop ? (
				<motion.div
					animate={{
						width: isSidebarOpen ? 250 : 0,
						opacity: isSidebarOpen ? 1 : 0,
						x: isSidebarOpen ? 0 : -250,
					}}
					transition={{ type: 'spring', stiffness: 320, damping: 30 }}
					className='sticky top-0 h-screen border-r border-border bg-background overflow-hidden z-20 flex-none'
				>
					<div className='w-[250px] h-full p-4 pr-2 pt-6 overflow-y-auto no-scrollbar'>
						{filters}
					</div>
				</motion.div>
			) : (
				<AnimatePresence>
					{isSidebarOpen && (
						<motion.div
							initial={{ x: -280 }}
							animate={{ x: 0 }}
							exit={{ x: -280 }}
							transition={{ type: 'spring', stiffness: 320, damping: 30 }}
							className='fixed top-0 left-0 h-full w-[280px] bg-background border-r border-border shadow-2xl z-50 p-6 pt-10 overflow-y-auto no-scrollbar'
						>
							{/* Close Button inside Sheet */}
							<div className='flex justify-end mb-4'>
								<Button
									variant='unstyled'
									onClick={() => setIsSidebarOpen(false)}
									className='text-main-secondary p-1 hover:text-main-primary cursor-pointer'
								>
									<X className='w-5 h-5' />
								</Button>
							</div>
							{filters}
						</motion.div>
					)}
				</AnimatePresence>
			)}

			{/* Main Content Area */}
			<div className='flex-1 w-full min-w-0'>
				{/* Top Actions Bar (Sticky) */}
				<div className='sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border py-3 px-4 flex items-center justify-between gap-4'>
					<Button
						variant='outline'
						onClick={() => setIsSidebarOpen((prev) => !prev)}
						className='flex items-center gap-x-2 !h-9 px-4 rounded-md border-border text-main-primary bg-background font-medium hover:bg-secondary cursor-pointer'
					>
						<SlidersHorizontal className='w-4 h-4 text-main-secondary' />
						<span className='text-xs'>
							{isSidebarOpen ? 'Hide Filters' : 'Show Filters'}
						</span>
					</Button>
					<ProductSort />
				</div>

				{/* Children Content (Product List) */}
				<div className='p-4 md:p-6 pb-24 min-w-0'>
					{children}
				</div>
			</div>
		</div>
	);
}
