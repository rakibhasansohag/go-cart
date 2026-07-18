import { cn } from '@/lib/utils';
import { Category } from '@prisma/client';
import { ChevronDown, Menu } from 'lucide-react';
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
			className='relative w-10 h-12 xl:w-[256px] xl:h-11 z-50'
			onMouseEnter={() => toggleMenu(true)}
			onMouseLeave={() => toggleMenu(false)}
		>
			{/* Trigger and Dropdown Container */}
			<div className='relative'>
				{/* Trigger */}
				<div
					onClick={() => toggleMenu(!dropdownVisible)}
					className={cn(
						'w-12 xl:w-[256px] h-12 rounded-full -translate-y-1 xl:translate-y-0 xl:h-11 bg-neutral-600 text-white text-[20px] relative flex items-center cursor-pointer transition-all duration-100 ease-in-out',
						{
							'w-[256px] bg-f5 text-main-primary text-base rounded-t-[20px] rounded-b-none scale-100':
								open,
							'scale-75': !open,
						},
					)}
				>
					{/* Menu Icon with transition to move right when open */}
					<Menu
						className={cn('absolute top-1/2 -translate-y-1/2 xl:ml-1', {
							'left-5': open,
							'left-3': !open,
						})}
					/>

					<span
						className={cn('hidden xl:inline-flex xl:ml-11', {
							'inline-flex !ml-14': open,
						})}
					>
						All Categories
					</span>

					<ChevronDown
						className={cn('hidden xl:inline-flex scale-75 absolute right-3', {
							'inline-flex': open,
						})}
					/>
				</div>
				{/* Dropdown */}
				<ul
					className={cn(
						'absolute top-11 left-0 w-[256px] bg-f5 shadow-lg rounded-b-[20px] transition-all duration-100 ease-in-out scrollbar overflow-y-auto',
						{
							'max-h-[523px] opacity-100': dropdownVisible, // Show dropdown
							'max-h-0 opacity-0': !dropdownVisible, // Hide dropdown
						},
					)}
				>
					{categories.map((category) => (
						<Link
							key={category.id}
							href={`/browse?category=${category.url}`}
							className='text-main-primary'
						>
							<li className='relative flex items-center m-0 p-3 pl-6 hover:bg-white dark:hover:bg-slate-700/50'>
								<Image
									src={category.image}
									alt={category.name}
									width={100}
									height={100}
									className='w-[18px] h-[18px]'
								/>
								<span className='text-sm font-normal ml-2 overflow-hidden line-clamp-2 break-words text-main-primary'>
									{category.name}
								</span>
							</li>
						</Link>
					))}
				</ul>
			</div>
		</div>
	);
}
