'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
	getUserOrders,
	getUserPayments,
	getUserReviews,
	getUserWishlist,
	getUserFollowedStores,
} from '@/queries/profile';
import { getCustomerReturns } from '@/queries/returns';

export default function ProfileSidebar() {
	const pathname = usePathname();
	const path = pathname.split('/profile/')[1];
	const path_trim = path ? path.split('/')[0] : null;

	const queryClient = useQueryClient();

	const prefetchRouteData = (link: string) => {
		if (link === '/profile/orders') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.profile.orders({ filter: '', period: '', search: '', page: 1, pageSize: 10 }),
				queryFn: () => getUserOrders('', '', '', 1, 10),
			});
		} else if (link === '/profile/payment') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.profile.payments({ filter: '', period: '', search: '', page: 1, pageSize: 10 }),
				queryFn: () => getUserPayments('', '', '', 1, 10),
			});
		} else if (link === '/profile/reviews') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.profile.reviews({ filter: '', period: '', search: '', page: 1, pageSize: 10 }),
				queryFn: () => getUserReviews('', '', '', 1, 10),
			});
		} else if (link === '/profile/returns') {
			queryClient.prefetchQuery({
				queryKey: queryKeys.profile.returns({
					status: 'ALL',
					page: 1,
					pageSize: 10,
				}),
				queryFn: () => getCustomerReturns('ALL', 1, 10),
			});
		} else if (link.startsWith('/profile/wishlist/')) {
			queryClient.prefetchQuery({
				queryKey: queryKeys.profile.wishlist(1),
				queryFn: () => getUserWishlist(1),
			});
		} else if (link.startsWith('/profile/following/')) {
			queryClient.prefetchQuery({
				queryKey: queryKeys.profile.following(1),
				queryFn: () => getUserFollowedStores(1),
			});
		}
	};

	return (
		<div className='w-full lg:w-[296px]'>
			{/* Breadcrumbs */}
			<div className='w-full p-4 text-xs text-main-secondary'>
				<span>
					<Link href='/'>Home</Link>
					<span className='mx-2'>&gt;</span>
				</span>
				<span>
					<Link href='/profile'>Account</Link>
					{pathname !== '/profile' && <span className='mx-2'>&gt;</span>}
				</span>
				{path && (
					<span>
						<Link href={pathname} className='capitalize'>
							{path_trim || path}
						</Link>
					</span>
				)}
			</div>

			{/* Desktop Sidebar (lg and up) */}
			<div className='hidden lg:block bg-background rounded-xl border border-border/10 shadow-sm'>
				<div className='py-3 inline-block w-full min-h-72'>
					<div className='font-bold text-main-primary flex h-9 items-center px-4'>
						<div className='whitespace-nowrap overflow-ellipsis overflow-hidden'>
							Account
						</div>
					</div>
					{/* Links */}
					{menu.map((item) => {
						const isActive = item.link && (
							pathname === item.link ||
							(pathname.startsWith(item.link) && item.link !== '/profile')
						);
						return (
							<Link key={item.link} href={item.link} prefetch={false}>
								<motion.div
									onMouseEnter={() => prefetchRouteData(item.link)}
									className={cn(
										'relative flex h-10 items-center text-sm px-4 cursor-pointer transition-all duration-200 select-none overflow-hidden rounded-md mx-2 my-1',
										isActive
											? 'text-[#fd384f] font-bold bg-[#fd384f]/10'
											: 'text-main-secondary hover:text-main-primary hover:bg-white/[0.04]',
									)}
									whileTap={{ scale: 0.97, x: 3 }}
								>
									{/* Active Sidebar Indicator Line */}
									{isActive && (
										<motion.div
											layoutId="active-sidebar-indicator"
											className="absolute left-0 top-0 bottom-0 w-1 bg-[#fd384f] rounded-r-full"
											transition={{
												type: 'spring',
												stiffness: 380,
												damping: 30,
											}}
										/>
									)}
									<span className="relative z-10 pl-1">{item.title}</span>
								</motion.div>
							</Link>
						);
					})}
				</div>
			</div>

			{/* Mobile/Tablet Horizontal Scroll Menu (below lg) */}
			<div className='block lg:hidden w-full overflow-hidden mb-2'>
				<div
					className='flex items-center gap-x-2 overflow-x-auto py-2.5 px-4 bg-background rounded-xl border border-border/10 shadow-sm w-full'
					style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
				>
					{menu.map((item) => {
						const isActive = item.link && (
							pathname === item.link ||
							(pathname.startsWith(item.link) && item.link !== '/profile')
						);
						return (
							<Link key={item.link} href={item.link} prefetch={false} className="shrink-0">
								<motion.div
									onMouseEnter={() => prefetchRouteData(item.link)}
									className={cn(
										'px-4 py-2 text-xs rounded-full font-medium transition-all duration-200 select-none whitespace-nowrap cursor-pointer',
										isActive
											? 'bg-[#fd384f] text-white shadow-sm font-semibold'
											: 'bg-secondary text-main-secondary hover:text-main-primary hover:bg-white/[0.02]',
									)}
									whileTap={{ scale: 0.95 }}
								>
									<span>{item.title}</span>
								</motion.div>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
}

const menu = [
	{
		title: 'Overview',
		link: '/profile',
	},
	{
		title: 'Orders',
		link: '/profile/orders',
	},
	{
		title: 'Payment',
		link: '/profile/payment',
	},
	{
		title: 'Returns',
		link: '/profile/returns',
	},
	{
		title: 'Shipping address',
		link: '/profile/addresses',
	},
	{
		title: 'Reviews',
		link: '/profile/reviews',
	},
	{
		title: 'History',
		link: '/profile/history/1',
	},
	{
		title: 'Wishlist',
		link: '/profile/wishlist/1',
	},
	{
		title: 'Following',
		link: '/profile/following/1',
	},
];
