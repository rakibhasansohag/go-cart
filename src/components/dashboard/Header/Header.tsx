'use client';

import { UserButton } from '@clerk/nextjs';
import ThemeToggle from '@/components/shared/theme-toggle';
import Link from 'next/link';
import { Home, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
	const pathname = usePathname();
	const isAdmin = pathname.startsWith('/dashboard/admin');

	return (
		<header className='fixed z-[20] lg:left-[300px] left-0 top-0 right-0 h-[65px] px-4 sm:px-6 bg-background/80 backdrop-blur-md flex items-center justify-between border-b border-border/60 transition-all'>
			{/* Left section: Quick Breadcrumb */}
			<div className='flex items-center gap-2 text-xs text-muted-foreground font-medium'>
				<Link
					href='/'
					className='flex items-center gap-1.5 hover:text-foreground transition-colors'
				>
					<Home className='w-3.5 h-3.5' />
					<span>Home</span>
				</Link>
				<span>/</span>
				<div className='flex items-center gap-1.5 text-foreground font-semibold'>
					<LayoutDashboard className='w-3.5 h-3.5 text-primary' />
					<span>{isAdmin ? 'Admin Portal' : 'Seller Dashboard'}</span>
				</div>
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
