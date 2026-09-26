'use client';

import { cn } from '@/lib/utils';
import { Category } from '@prisma/client';
import { ChevronDown, ChevronRight, Menu, Layers } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Dispatch, SetStateAction, useRef, useCallback } from 'react';
import useOnClickOutside from '@/hooks/useOnClickOutside';

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
			className={cn(
				'relative h-11 z-40 transition-all duration-300 ease-out',
				open ? 'w-[256px]' : 'w-11 lg:w-[185px]',
			)}
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
						'h-11 relative flex items-center cursor-pointer transition-all duration-300 ease-out shadow-xs select-none border-none outline-none text-left',
						open
							? 'w-[256px] bg-f5 text-main-primary dark:bg-slate-800 dark:text-white text-base rounded-t-[20px] rounded-b-none shadow-md'
							: 'w-11 lg:w-[185px] bg-neutral-600 hover:bg-neutral-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-full justify-center lg:justify-start',
					)}
				>
					{/* Menu Icon */}
					<Menu
						className={cn(
							'transition-all duration-300 ease-out shrink-0 w-5 h-5',
							open
								? 'absolute left-5 top-1/2 -translate-y-1/2 text-main-primary dark:text-white'
								: 'static lg:absolute lg:left-3.5 lg:top-1/2 lg:-translate-y-1/2 text-white',
						)}
					/>

					{/* Label - visible on lg+ when closed, or ALWAYS visible when open */}
					<span
						className={cn(
							'text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-out',
							open
								? 'inline-flex ml-14 text-main-primary dark:text-white'
								: 'hidden lg:inline-flex ml-10 text-white',
						)}
					>
						All Categories
					</span>

					{/* Chevron - visible on lg+ when closed, or ALWAYS visible when open */}
					<ChevronDown
						className={cn(
							'w-4 h-4 absolute right-3 transition-transform duration-300 ease-out shrink-0',
							open
								? 'inline-flex rotate-180 text-main-primary dark:text-white'
								: 'hidden lg:inline-flex text-white',
						)}
					/>
				</button>

				{/* Dropdown */}
				{open && (
					<ul className='absolute top-11 left-0 w-[256px] bg-f5 dark:bg-slate-800 shadow-2xl rounded-b-[20px] border-x border-b border-border/20 dark:border-slate-700/60 max-h-[500px] scrollbar overflow-y-auto overflow-x-hidden transform origin-top z-50 animate-in fade-in-0 zoom-in-95 duration-150'>
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
					</ul>
				)}
			</div>
		</div>
	);
}
