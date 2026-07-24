'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { icons } from '@/constants/icons';
import { DashboardSidebarMenuInterface } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { queryKeys } from '@/lib/query-keys';
import { getSellerStoreAnalyticsData } from '@/queries/analytics';
import { getAllStoreProducts } from '@/queries/product';
import { getStoreCoupons } from '@/queries/coupon';
import { getStoreInventory } from '@/queries/inventory';
import {
	getStoreDefaultShippingDetails,
	getStoreOrders,
	getStoreShippingRates,
	getStoreByUrl,
} from '@/queries/store';

interface SidebarNavSellerProps {
	menuLinks: DashboardSidebarMenuInterface[];
	onNavigate?: () => void;
}

export default function SidebarNavSeller({
	menuLinks,
	onNavigate,
}: SidebarNavSellerProps) {
	const pathname = usePathname();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState('');

	const storeUrlStart = pathname.split('/stores/')[1];
	const activeStore = storeUrlStart ? storeUrlStart.split('/')[0] : '';

	const filteredLinks = menuLinks.filter((link) =>
		link.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleHover = (linkItem: string) => {
		const targetHref = `/dashboard/seller/stores/${activeStore}/${linkItem}`;
		router.prefetch(targetHref);
		if (!activeStore) return;

		if (linkItem === '') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.sellerAnalytics(activeStore),
				queryFn: () => getSellerStoreAnalyticsData(activeStore),
			});
		} else if (linkItem === 'products') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.products(activeStore),
				queryFn: () => getAllStoreProducts(activeStore),
			});
		} else if (linkItem === 'orders') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.orders(activeStore),
				queryFn: () => getStoreOrders(activeStore),
			});
		} else if (linkItem === 'coupons') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.coupons(activeStore),
				queryFn: () => getStoreCoupons(activeStore),
			});
		} else if (linkItem === 'inventory') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.inventory(activeStore),
				queryFn: () => getStoreInventory(activeStore),
			});
		} else if (linkItem === 'shipping') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.shipping(activeStore),
				queryFn: async () => {
					const [details, rates] = await Promise.all([
						getStoreDefaultShippingDetails(activeStore),
						getStoreShippingRates(activeStore),
					]);
					return { details, rates };
				},
			});
		} else if (linkItem === 'settings') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.storeSettings(activeStore),
				queryFn: () => getStoreByUrl(activeStore),
			});
		}
	};

	return (
		<div className='flex flex-col gap-3 w-full grow'>
			{/* Menu Search Filter */}
			<div className='relative w-full mb-2'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none' />
				<Input
					placeholder='Search menu...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='h-9 text-xs pl-8 bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-primary rounded-lg transition-colors'
				/>
			</div>

			{/* Navigation List */}
			<nav className='space-y-1.5 w-full relative'>
				{filteredLinks.length === 0 ? (
					<p className='text-xs text-muted-foreground text-center py-4'>
						No menu links found.
					</p>
				) : (
					filteredLinks.map((link, index) => {
						let icon;
						const iconSearch = icons.find((icon) => icon.value === link.icon);
						if (iconSearch) icon = <iconSearch.path />;

						const targetHref = `/dashboard/seller/stores/${activeStore}/${link.link}`;
						const isActive =
							link.link === ''
								? pathname === `/dashboard/seller/stores/${activeStore}`
								: targetHref === pathname;

						return (
							<motion.div
								key={index}
								whileHover={{ x: 3 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: 'spring', stiffness: 400, damping: 25 }}
								className='relative'
								onMouseEnter={() => handleHover(link.link)}
							>
								{/* Active Pill Indicator */}
								{isActive && (
									<motion.span
										layoutId='sidebar-active-indicator-seller'
										transition={{ type: 'spring', stiffness: 400, damping: 30 }}
										className='absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-xs z-20 pointer-events-none'
									/>
								)}

								<Link
									href={targetHref}
									prefetch={true}
									onClick={() => {
										if (onNavigate) onNavigate();
									}}
									className={cn(
										'relative z-10 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 select-none group',
										isActive
											? 'bg-primary/10 text-primary font-semibold'
											: 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
									)}
								>
									<motion.span
										whileHover={{ scale: 1.15, rotate: 2 }}
										transition={{ type: 'spring', stiffness: 350, damping: 15 }}
										className={cn(
											'shrink-0 transition-colors duration-200',
											isActive ? 'text-primary' : 'group-hover:text-primary'
										)}
									>
										{icon}
									</motion.span>
									<span className='truncate'>{link.label}</span>
								</Link>
							</motion.div>
						);
					})
				)}
			</nav>
		</div>
	);
}
