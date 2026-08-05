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
import { getAdminAnalyticsData, getAllAdminOrders } from '@/queries/analytics';
import { getAllCategories } from '@/queries/category';
import { getAllSubCategories } from '@/queries/subCategory';
import { getAllOfferTags } from '@/queries/offer-tag';
import { getAllStores } from '@/queries/store';
import { getEmailTemplates } from '@/queries/email-templates';
import { getAdminReturns } from '@/queries/returns';
import { getAdminDeliveryHealth } from '@/queries/notifications';

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
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState('');

	const filteredLinks = menuLinks.filter((link) =>
		link.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleHover = (link: string) => {
		router.prefetch(link);
		if (link === '/dashboard/admin') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.adminAnalytics(),
				queryFn: () => getAdminAnalyticsData(),
			});
		} else if (link === '/dashboard/admin/orders') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.adminOrders(),
				queryFn: () => getAllAdminOrders(),
			});
		} else if (link === '/dashboard/admin/categories') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.categories(),
				queryFn: () => getAllCategories(),
			});
		} else if (link === '/dashboard/admin/subCategories') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.subCategories(),
				queryFn: () => getAllSubCategories(),
			});
		} else if (link === '/dashboard/admin/offer-tags') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.offerTags(),
				queryFn: () => getAllOfferTags(),
			});
		} else if (link === '/dashboard/admin/stores') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.stores(),
				queryFn: () => getAllStores(),
			});
		} else if (link === '/dashboard/admin/returns') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.adminReturns({ status: 'ALL', page: 1, pageSize: 10, search: '' }),
				queryFn: () => getAdminReturns('ALL', 1, 10, ''),
			});
		} else if (link === '/dashboard/admin/email-templates') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.dashboard.emailTemplates(),
				queryFn: getEmailTemplates,
				staleTime: 5 * 60 * 1000,
			});
		} else if (link === '/dashboard/admin/delivery-health') {
			queryClient.prefetchQuery({
				queryKey: ['admin', 'delivery-health'],
				queryFn: getAdminDeliveryHealth,
				staleTime: 30 * 1000,
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

						const isActive = link.link === pathname;

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
										layoutId='sidebar-active-indicator-admin'
										transition={{ type: 'spring', stiffness: 400, damping: 30 }}
										className='absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-xs z-20 pointer-events-none'
									/>
								)}

								<Link
									href={link.link}
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
