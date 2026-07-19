'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
	title: string;
	value: T;
}

interface TabsProps<T extends string = string> {
	items: TabItem<T>[];
	value: T;
	onChange: (value: T) => void;
	layoutId: string;
	className?: string;
	tabClassName?: string;
}

export default function Tabs<T extends string = string>({
	items,
	value,
	onChange,
	layoutId,
	className,
	tabClassName,
}: TabsProps<T>) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	return (
		<div
			className={cn(
				'py-4 inline-flex items-center bg-background justify-center relative',
				className
			)}
		>
			<AnimatePresence>
				{items.map((item, idx) => {
					const isActive = item.value === value;
					return (
						<button
							key={item.value}
							onMouseEnter={() => setHoveredIndex(idx)}
							onMouseLeave={() => setHoveredIndex(null)}
							onClick={() => onChange(item.value)}
							className={cn(
								'relative px-4 text-main-primary whitespace-nowrap cursor-pointer leading-6 transition-colors duration-200 bg-transparent border-none outline-none focus:outline-none focus:ring-0 select-none font-medium',
								isActive ? 'font-bold text-main-primary' : 'text-gray-500 hover:text-main-primary',
								tabClassName
							)}
						>
							{/* Hover Underline */}
							{hoveredIndex === idx && !isActive && (
								<motion.div
									layoutId={`hover-underline-${layoutId}`}
									className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 h-[3px] w-6 bg-[#fd384f]/30 rounded-full pointer-events-none z-0"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.15 }}
								/>
							)}

							{/* Active Sliding Underline */}
							{isActive && (
								<motion.div
									layoutId={`active-underline-${layoutId}`}
									className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 h-[3px] w-6 bg-[#fd384f] rounded-full z-10"
									transition={{
										type: 'spring',
										stiffness: 380,
										damping: 30,
									}}
								/>
							)}

							{/* Tap/Click Animation */}
							<motion.span
								whileTap={{ scale: 0.95 }}
								className="block relative z-10 pointer-events-none"
							>
								{item.title}
							</motion.span>
						</button>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
