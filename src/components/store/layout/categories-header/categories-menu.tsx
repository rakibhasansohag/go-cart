'use client';

import { cn } from '@/lib/utils';
import { Category } from '@prisma/client';
import { ChevronDown, ChevronRight, Menu, Layers } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Dispatch, SetStateAction, useRef, useCallback } from 'react';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { AnimatePresence, motion } from 'framer-motion';

export default function CategoriesMenu({
	categories,
	open,
	setOpen,
}: {
	categories: Category[];
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	const closeMenu = useCallback(() => {
		setOpen(false);
	}, [setOpen]);

	// Close the dropdown when clicking outside of it
	useOnClickOutside(containerRef, closeMenu);

	const handleMouseEnter = () => {
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
			setOpen(true);
		}
	};

	const handleMouseLeave = () => {
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
			setOpen(false);
		}
	};

	const handleTriggerClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setOpen((prev) => !prev);
	};

	return (
		<div
			ref={containerRef}
			className='relative h-11 z-40 w-11 lg:w-[185px]'
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{/* Trigger and Dropdown Container */}
			<div className='relative'>
				{/* Trigger */}
				<button
					type='button'
					onClick={handleTriggerClick}
					aria-expanded={open}
					aria-haspopup='true'
					aria-label='All Categories'
					className={cn(
						'h-11 w-11 lg:w-[185px] relative flex items-center justify-center lg:justify-start cursor-pointer transition-colors duration-200 shadow-xs select-none border-none outline-none text-left rounded-full',
						open
							? 'bg-f5 text-main-primary dark:bg-slate-800 dark:text-white'
							: 'bg-neutral-600 hover:bg-neutral-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white',
					)}
				>
					{/* Menu Icon */}
					<Menu
						className={cn(
							'transition-colors duration-200 shrink-0 w-5 h-5 static lg:absolute lg:left-3.5 lg:top-1/2 lg:-translate-y-1/2',
							open
								? 'text-main-primary dark:text-white'
								: 'text-white',
						)}
					/>

					{/* Keep the trigger width stable while the dropdown opens */}
					<span
						className={cn(
							'hidden lg:inline-flex ml-10 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
							open
								? 'text-main-primary dark:text-white'
								: 'text-white',
						)}
					>
						All Categories
					</span>

					{/* Chevron */}
					<ChevronDown
						className={cn(
							'hidden lg:inline-flex w-4 h-4 absolute right-3 transition-transform duration-200 ease-out shrink-0',
							open
								? 'rotate-180 text-main-primary dark:text-white'
								: 'text-white',
						)}
					/>
				</button>

				{/* Dropdown */}
				<AnimatePresence initial={false}>
					{open && (
						<motion.ul
							key='categories'
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0, pointerEvents: 'auto' }}
							exit={{ opacity: 0, y: -4, pointerEvents: 'none', transition: { duration: 0.14 } }}
							transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className='absolute top-11 left-0 w-[256px] bg-f5 dark:bg-slate-800 shadow-2xl rounded-[20px] border border-border/20 dark:border-slate-700/60 max-h-[500px] scrollbar overflow-y-auto overflow-x-hidden origin-top z-50'
						>
							{categories.map((category, index) => {
								const isLast = index === categories.length - 1;
								return (
									<Link
										key={category.id}
										href={`/browse?category=${category.url}`}
										onClick={closeMenu}
										className='group block text-main-primary'
									>
										<li
											className={cn(
												'relative flex items-center m-0 py-2.5 px-5 transition-all duration-200 ease-out hover:bg-white dark:hover:bg-slate-700/80 cursor-pointer select-none',
												isLast && 'rounded-b-[20px]',
											)}
										>
											<div className='flex items-center flex-1 min-w-0 transition-transform duration-200 ease-out group-hover:translate-x-1.5'>
												{category.image ? (
													<Image
														src={category.image}
														alt={category.name}
														width={18}
														height={18}
														className='w-[18px] h-[18px] object-contain transition-transform duration-200 ease-out group-hover:scale-110 shrink-0'
													/>
												) : (
													<Layers className='w-[18px] h-[18px] text-muted-foreground/70 transition-transform duration-200 ease-out group-hover:scale-110 shrink-0' />
												)}
												<span className='text-sm font-medium ml-2.5 overflow-hidden line-clamp-2 break-words text-main-primary dark:text-slate-100 group-hover:text-primary transition-colors duration-150'>
													{category.name}
												</span>
											</div>
											<ChevronRight className='w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1.5 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200 text-muted-foreground shrink-0' />
										</li>
									</Link>
								);
							})}
						</motion.ul>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
