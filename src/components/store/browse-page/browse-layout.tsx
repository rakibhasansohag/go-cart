'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductSort from './sort';

interface BrowseLayoutClientProps {
	filters: React.ReactNode;
	children: React.ReactNode;
}

export default function BrowseLayoutClient({
	filters,
	children,
}: BrowseLayoutClientProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	return (
		<div className='flex min-h-screen pt-[140px] lg:pt-[64px] relative bg-background'>
			{/* Collapsible Sidebar */}
			<motion.div
				animate={{
					width: isSidebarOpen ? 250 : 0,
					opacity: isSidebarOpen ? 1 : 0,
					x: isSidebarOpen ? 0 : -250,
				}}
				transition={{ type: 'spring', stiffness: 320, damping: 30 }}
				className='fixed top-[140px] lg:top-[64px] left-0 h-[calc(100vh-140px)] lg:h-[calc(100vh-64px)] border-r border-border bg-background overflow-hidden z-20 flex-none'
			>
				<div className='w-[250px] h-full p-4 pr-2 pt-6 overflow-y-auto no-scrollbar'>
					{filters}
				</div>
			</motion.div>

			{/* Main Content Area */}
			<motion.div
				animate={{
					paddingLeft: isSidebarOpen ? 250 : 0,
				}}
				transition={{ type: 'spring', stiffness: 320, damping: 30 }}
				className='flex-1 w-full'
			>
				{/* Top Actions Bar (Sticky) */}
				<div className='sticky top-[140px] lg:top-[64px] z-10 bg-background/90 backdrop-blur-md border-b border-border py-3 px-4 flex items-center justify-between gap-4'>
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

				{/* Children Content (Sort + Product List) */}
				<div className='p-4 md:p-6 pb-24'>
					{children}
				</div>
			</motion.div>
		</div>
	);
}
