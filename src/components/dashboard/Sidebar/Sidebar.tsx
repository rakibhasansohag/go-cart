// React, Next.js
import { FC } from 'react';

// Clerk
import { currentUser } from '@clerk/nextjs/server';

// Custom Ui Components
import Logo from '@/components/shared/logo';
import UserInfo from './user-info';
import SidebarNavAdmin from './nav-admin';
import SidebarNavSeller from './nav-seller';

// Menu links
import {
	SellerDashboardSidebarOptions,
	adminDashboardSidebarOptions,
} from '@/constants/data';
import { Separator } from '@/components/ui/separator';
import { Store } from '@prisma/client';
import StoreSwitcher from './store-switcher';
import Link from 'next/link';

interface SidebarProps {
	isAdmin?: boolean;
	stores?: Store[];
}

const Sidebar: FC<SidebarProps> = async ({ isAdmin, stores }) => {
	const user = await currentUser();
	return (
		<aside className='hidden lg:flex w-[300px] border-r border-border/60 h-screen p-4 flex-col fixed top-0 left-0 bottom-0 bg-background z-30 overflow-y-auto scrollbar-none'>
			<Link href='/' replace className='shrink-0'>
				<Logo width='100%' height='180px' />
			</Link>
			<Separator className='mt-3 shrink-0' />
			{user && <UserInfo user={user} />}
			{!isAdmin && stores && <StoreSwitcher stores={stores} />}
			{isAdmin ? (
				<SidebarNavAdmin menuLinks={adminDashboardSidebarOptions} />
			) : (
				<SidebarNavSeller menuLinks={SellerDashboardSidebarOptions} />
			)}
		</aside>
	);
};

export default Sidebar;
