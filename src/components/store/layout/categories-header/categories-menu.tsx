import { cn } from '@/lib/utils';
import { Category } from '@prisma/client';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Dispatch, SetStateAction, useState, useRef } from 'react';
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
	const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const toggleMenu = (state: boolean) => {
		setOpen(state);
		setDropdownVisible(state);
	};

	// Close the dropdown when clicking outside of it
	useOnClickOutside(containerRef, () => {
		toggleMenu(false);
	});

	return (
		<div
			ref={containerRef}
			className={cn(
				'relative h-12 xl:h-11 z-30 transition-all duration-300 ease-out',
				open ? 'w-[256px]' : 'w-12 xl:w-[185px]',
			)}
			onMouseEnter={() => toggleMenu(true)}
			onMouseLeave={() => toggleMenu(false)}
		>
			{/* Trigger and Dropdown Container */}
			<div className='relative'>
				{/* Trigger */}
				<div
					onClick={() => toggleMenu(!dropdownVisible)}
					className={cn(
						'h-12 -translate-y-1 xl:translate-y-0 xl:h-11 relative flex items-center cursor-pointer transition-all duration-300 ease-out shadow-xs select-none',
						open
							? 'w-[256px] bg-f5 text-main-primary dark:bg-slate-800 dark:text-white text-base rounded-t-[20px] rounded-b-none shadow-md'
							: 'w-12 xl:w-[185px] bg-neutral-600 hover:bg-neutral-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-full',
					)}
				>
					{/* Menu Icon with transition to move right when open */}
					<Menu
						className={cn(
							'absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out shrink-0',
							open ? 'left-5' : 'left-3.5',
						)}
					/>

					<span
						className={cn(
							'hidden xl:inline-flex text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-out',
							open ? 'ml-14' : 'ml-10',
						)}
					>
						All Categories
					</span>

					<ChevronDown
						className={cn(
							'hidden xl:inline-flex w-4 h-4 absolute right-3 transition-transform duration-300 ease-out shrink-0',
							open && 'rotate-180',
						)}
					/>
				</div>
				{/* Dropdown */}
				<ul
					className={cn(
						'absolute top-11 left-0 w-[256px] bg-f5 dark:bg-slate-800 shadow-xl rounded-b-[20px] border-x border-b border-border/20 transition-all duration-300 ease-out scrollbar overflow-y-auto overflow-x-hidden transform origin-top z-30',
						{
							'max-h-[523px] opacity-100 scale-y-100 translate-y-0 visible pointer-events-auto':
								dropdownVisible,
							'max-h-0 opacity-0 scale-y-95 -translate-y-2 invisible pointer-events-none':
								!dropdownVisible,
						},
					)}
				>
					{categories.map((category, index) => {
						const isLast = index === categories.length - 1;
						return (
							<Link
								key={category.id}
								href={`/browse?category=${category.url}`}
								className='group block text-main-primary'
							>
								<li
									className={cn(
										'relative flex items-center m-0 py-2.5 px-5 transition-all duration-200 ease-out hover:bg-white dark:hover:bg-slate-700/80 cursor-pointer select-none',
										isLast && 'rounded-b-[20px]',
									)}
								>
									<div className='flex items-center flex-1 min-w-0 transition-transform duration-200 ease-out group-hover:translate-x-1.5'>
										<Image
											src={category.image}
											alt={category.name}
											width={18}
											height={18}
											className='w-[18px] h-[18px] object-contain transition-transform duration-200 ease-out group-hover:scale-110 shrink-0'
										/>
										<span className='text-sm font-medium ml-2.5 overflow-hidden line-clamp-2 break-words text-main-primary group-hover:text-primary transition-colors duration-150'>
											{category.name}
										</span>
									</div>
									<ChevronRight className='w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1.5 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200 text-muted-foreground shrink-0' />
								</li>
							</Link>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
