'use client';

import { useState } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import ThemeToggle from '@/components/shared/theme-toggle';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import Logo from '@/components/shared/logo';
import UserInfo from '../Sidebar/user-info';
import StoreSwitcher from '../Sidebar/store-switcher';
import SidebarNavAdmin from '../Sidebar/nav-admin';
import SidebarNavSeller from '../Sidebar/nav-seller';
import {
	adminDashboardSidebarOptions,
	SellerDashboardSidebarOptions,
} from '@/constants/data';
import { Store } from '@prisma/client';
import { Button } from '@/components/ui/button';
import DashboardBreadcrumbs from './dashboard-breadcrumbs';

interface HeaderProps {
	isAdmin?: boolean;
	stores?: Store[];
}

export default function Header({ isAdmin: propIsAdmin, stores }: HeaderProps) {
	const pathname = usePathname();
	const isAdmin = propIsAdmin ?? pathname.startsWith('/dashboard/admin');
	const { user } = useUser();
	const [openMobile, setOpenMobile] = useState(false);

	return (
		<header className='fixed z-[20] lg:left-[300px] left-0 top-0 right-0 h-[65px] px-4 sm:px-6 bg-background/80 backdrop-blur-md flex items-center justify-between border-b border-border/60 transition-all'>
			{/* Left section: Mobile Toggle & Quick Breadcrumb */}
			<div className='flex items-center gap-2.5'>
				{/* Mobile Sidebar Trigger (lg:hidden) */}
				<Sheet open={openMobile} onOpenChange={setOpenMobile}>
					<SheetTrigger asChild>
						<Button
							variant='outline'
							size='icon'
							className='lg:hidden h-9 w-9 border-border/60 shrink-0 hover:bg-muted/80'
							aria-label='Toggle Dashboard Menu'
						>
							<Menu className='w-4 h-4' />
						</Button>
					</SheetTrigger>
					<SheetContent
						side='left'
						className='w-[300px] sm:w-[320px] p-4 flex flex-col h-full bg-background border-r border-border/60 overflow-y-auto scrollbar-none'
					>
						<SheetHeader className='p-0 text-left sr-only'>
							<SheetTitle>Dashboard Navigation</SheetTitle>
						</SheetHeader>
						<Link
							href='/'
							replace
							className='shrink-0 mb-1'
							onClick={() => setOpenMobile(false)}
						>
							<Logo width='100%' height='160px' />
						</Link>
						{user && <UserInfo user={user} />}
						{!isAdmin && stores && stores.length > 0 && (
							<StoreSwitcher stores={stores} />
						)}
						<div className='mt-2 flex-1'>
							{isAdmin ? (
								<SidebarNavAdmin
									menuLinks={adminDashboardSidebarOptions}
									onNavigate={() => setOpenMobile(false)}
								/>
							) : (
								<SidebarNavSeller
									menuLinks={SellerDashboardSidebarOptions}
									onNavigate={() => setOpenMobile(false)}
								/>
							)}
						</div>
					</SheetContent>
				</Sheet>

				{/* Dynamic Dashboard Breadcrumbs */}
				<DashboardBreadcrumbs />
			</div>

			{/* Right section: Theme & Profile */}
			<div className='flex items-center gap-3'>
				<ThemeToggle />
				<UserButton
					appearance={{
						elements: {
							avatarBox: 'w-8 h-8 rounded-full ring-2 ring-primary/20',
						},
					}}
				/>
			</div>
		</header>
	);
}
