'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductSort from '../browse-page/sort';

interface StoreLayoutClientProps {
	filters: React.ReactNode;
	children: React.ReactNode;
}

export default function StoreLayoutClient({
	filters,
	children,
}: StoreLayoutClientProps) {
	const [isDesktop, setIsDesktop] = useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	useEffect(() => {
		setIsDesktop(window.innerWidth >= 1024);
		const handleResize = () => {
			setIsDesktop(window.innerWidth >= 1024);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		if (isDesktop) {
			setIsSidebarOpen(true);
		} else {
			setIsSidebarOpen(false);
		}
	}, [isDesktop]);

	return (
		<div className='flex relative w-full mt-6 md:mt-10'>
			{/* Backdrop for Mobile Drawer */}
			<AnimatePresence>
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

			{/* Sidebar Drawer (Desktop Inline / Mobile Drawer Sheet) */}
			{isDesktop ? (
				<motion.div
					animate={{
						width: isSidebarOpen ? 250 : 0,
						opacity: isSidebarOpen ? 1 : 0,
						marginRight: isSidebarOpen ? 24 : 0,
					}}
					transition={{ type: 'spring', stiffness: 320, damping: 30 }}
					className='overflow-hidden z-20 flex-none'
				>
					<div className='w-[250px] p-4 border border-border/10 rounded-xl bg-background shadow-sm'>
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
							<div className='flex justify-end mb-4'>
								<button
									onClick={() => setIsSidebarOpen(false)}
									className='text-main-secondary p-1 hover:text-main-primary cursor-pointer border-0 bg-transparent'
								>
									<X className='w-5 h-5' />
								</button>
							</div>
							{filters}
						</motion.div>
					)}
				</AnimatePresence>
			)}

			{/* Products Content Column */}
			<div className='flex-1 min-w-0'>
				{/* Top Actions Bar */}
				<div className='flex items-center justify-between gap-4 mb-4 bg-background p-3 rounded-xl border border-border/10 shadow-sm'>
					<button
						onClick={() => setIsSidebarOpen((prev) => !prev)}
						className='flex items-center gap-x-2 h-9 px-4 rounded-lg border border-border bg-background text-main-primary font-medium hover:bg-secondary cursor-pointer transition-colors text-xs'
					>
						<SlidersHorizontal className='w-3.5 h-3.5 text-main-secondary' />
						<span>
							{isSidebarOpen ? 'Hide Filters' : 'Show Filters'}
						</span>
					</button>
					<ProductSort />
				</div>

				<div className='min-w-0'>
					{children}
				</div>
			</div>
		</div>
	);
}
