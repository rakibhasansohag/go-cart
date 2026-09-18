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
			className='relative w-10 h-12 xl:w-[256px] xl:h-11 z-30'
			onMouseEnter={() => toggleMenu(true)}
			onMouseLeave={() => toggleMenu(false)}
		>
			{/* Trigger and Dropdown Container */}
			<div className='relative'>
				{/* Trigger */}
				<div
					onClick={() => toggleMenu(!dropdownVisible)}
					className={cn(
						'w-12 xl:w-[256px] h-12 rounded-full -translate-y-1 xl:translate-y-0 xl:h-11 bg-neutral-600 text-white text-xl relative flex items-center cursor-pointer transition-all duration-300 ease-out shadow-xs',
						{
							'w-[256px] bg-f5 text-main-primary dark:bg-slate-800 dark:text-white text-base rounded-t-[20px] rounded-b-none scale-100 shadow-md':
								open,
							'scale-75 xl:scale-100 hover:scale-[0.8] xl:hover:scale-100': !open,
						},
					)}
				>
					{/* Menu Icon with transition to move right when open */}
					<Menu
						className={cn(
							'absolute top-1/2 -translate-y-1/2 xl:ml-1 transition-all duration-300 ease-out',
							{
								'left-5': open,
								'left-3': !open,
							},
						)}
					/>

					<span
						className={cn('hidden xl:inline-flex xl:ml-11 transition-all duration-300 ease-out', {
							'inline-flex !ml-14': open,
						})}
					>
						All Categories
					</span>

					<ChevronDown
						className={cn(
							'hidden xl:inline-flex scale-75 absolute right-3 transition-transform duration-300 ease-out',
							{
								'inline-flex rotate-180': open,
							},
						)}
					/>
				</div>
				{/* Dropdown */}
				<ul
					className={cn(
						'absolute top-11 left-0 w-[256px] bg-f5 dark:bg-slate-800 shadow-xl rounded-b-[20px] border-x border-b border-border/20 transition-all duration-300 ease-out scrollbar overflow-y-auto transform origin-top z-30',
						{
							'max-h-[523px] opacity-100 scale-y-100 translate-y-0 visible pointer-events-auto':
								dropdownVisible,
							'max-h-0 opacity-0 scale-y-95 -translate-y-2 invisible pointer-events-none':
								!dropdownVisible,
						},
					)}
				>
					{categories.map((category) => (
						<Link
							key={category.id}
							href={`/browse?category=${category.url}`}
							className='group block text-main-primary'
						>
							<li className='relative flex items-center m-0 py-2.5 px-5 transition-all duration-200 ease-out hover:bg-white dark:hover:bg-slate-700/80 hover:translate-x-1.5 cursor-pointer'>
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
								<ChevronRight className='w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1.5 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200 text-muted-foreground shrink-0' />
							</li>
						</Link>
					))}
				</ul>
			</div>
		</div>
	);
}
