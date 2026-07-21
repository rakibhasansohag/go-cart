'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { icons } from '@/constants/icons';
import { DashboardSidebarMenuInterface } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SidebarNavAdminProps {
	menuLinks: DashboardSidebarMenuInterface[];
	onNavigate?: () => void;
}

export default function SidebarNavAdmin({
	menuLinks,
	onNavigate,
}: SidebarNavAdminProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');

	const filteredLinks = menuLinks.filter((link) =>
		link.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className='flex flex-col gap-3 w-full grow'>
			{/* Menu Search Filter */}
			<div className='relative w-full'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none' />
				<Input
					placeholder='Search menu...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='h-9 text-xs pl-8 bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-primary rounded-lg transition-colors'
				/>
			</div>

			{/* Navigation List */}
			<nav className='space-y-1.5 w-full'>
				{filteredLinks.length === 0 ? (
					<p className='text-xs text-muted-foreground text-center py-4'>
						No menu links found.
					</p>
				) : (
					filteredLinks.map((link, index) => {
						let icon;
						const iconSearch = icons.find((icon) => icon.value === link.icon);
						if (iconSearch) icon = <iconSearch.path />;

						const isActive = link.link === pathname;

						return (
							<Link
								key={index}
								href={link.link}
								onMouseEnter={() => router.prefetch(link.link)}
								onClick={onNavigate}
								className={cn(
									'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-in-out group select-none',
									isActive
										? 'bg-primary/10 text-primary font-semibold shadow-xs'
										: 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
								)}
							>
								{isActive && (
									<span className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-xs transition-all duration-300' />
								)}
								<span
									className={cn(
										'transition-transform duration-300 ease-in-out group-hover:scale-110 shrink-0',
										isActive ? 'text-primary' : 'group-hover:text-primary'
									)}
								>
									{icon}
								</span>
								<span className='truncate'>{link.label}</span>
							</Link>
						);
					})
				)}
			</nav>
		</div>
	);
}
