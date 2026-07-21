'use client';

// React, Next.js
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// UI Components
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';

// Icons
import { icons } from '@/constants/icons';

// types
import { DashboardSidebarMenuInterface } from '@/lib/types';

// Utils
import { cn } from '@/lib/utils';

interface SidebarNavSellerProps {
	menuLinks: DashboardSidebarMenuInterface[];
	onNavigate?: () => void;
}

export default function SidebarNavSeller({
	menuLinks,
	onNavigate,
}: SidebarNavSellerProps) {
	const pathname = usePathname();
	const storeUrlStart = pathname.split('/stores/')[1];
	const activeStore = storeUrlStart ? storeUrlStart.split('/')[0] : '';

	return (
		<nav className='relative grow'>
			<Command className='rounded-lg overflow-visible bg-transparent'>
				<CommandInput placeholder='Search menu...' className='h-9 text-xs' />
				<CommandList className='py-2 overflow-visible'>
					<CommandEmpty>No Links Found.</CommandEmpty>
					<CommandGroup className='overflow-visible pt-1 relative space-y-1'>
						{menuLinks.map((link, index) => {
							let icon;
							const iconSearch = icons.find((icon) => icon.value === link.icon);
							if (iconSearch) icon = <iconSearch.path />;

							const targetHref = `/dashboard/seller/stores/${activeStore}/${link.link}`;
							const isActive =
								link.link === ''
									? pathname === `/dashboard/seller/stores/${activeStore}`
									: targetHref === pathname;

							return (
								<CommandItem
									key={index}
									className={cn(
										'w-full h-11 cursor-pointer my-1 rounded-xl p-0 relative transition-all duration-200 group',
										isActive
											? 'bg-primary/10 text-primary font-semibold'
											: 'text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:translate-x-1'
									)}
								>
									{isActive && (
										<span className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-xs' />
									)}
									<Link
										href={targetHref}
										onClick={onNavigate}
										className='flex items-center gap-3 px-3.5 py-2.5 w-full h-full text-sm font-medium'
									>
										<span
											className={cn(
												'transition-transform duration-200 group-hover:scale-110',
												isActive ? 'text-primary' : 'group-hover:text-primary'
											)}
										>
											{icon}
										</span>
										<span>{link.label}</span>
									</Link>
								</CommandItem>
							);
						})}
					</CommandGroup>
				</CommandList>
			</Command>
		</nav>
	);
}
