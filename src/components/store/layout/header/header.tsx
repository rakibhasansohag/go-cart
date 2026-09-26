import Link from 'next/link';
import UserMenu from './user-menu/user-menu';
import DownloadApp from './download-app';
import Search from './search/search';
import { cookies } from 'next/headers';
import { Country } from '@/lib/types';

import CountryLanguageCurrencySelector from './country-lang-curr-selector';
import Cart from './cart';
import { DEFAULT_COUNTRY } from '@/lib/utils';
import ThemeToggle from '@/components/shared/theme-toggle';
import NotificationBell from '@/components/shared/notification-bell';
import CheckInTrigger from '@/components/store/checkin/checkin-trigger';
import { BookOpen } from 'lucide-react';

export default async function Header() {
	// Get cookies from the store
	const cookieStore = cookies();
	const userCountryCookie = (await cookieStore).get('userCountry');

	let userCountry = DEFAULT_COUNTRY;

	// If cookie exists, update the user country
	if (userCountryCookie) {
		userCountry = JSON.parse(userCountryCookie?.value) as Country;
	}

	return (
		<div className='bg-gradient-to-r from-slate-500 to-slate-800 sticky top-0 z-50'>
			<div className='h-full w-full max-w-[1600px] mx-auto overflow-hidden lg:overflow-visible lg:flex text-white px-4 sm:px-6 lg:px-12'>
				<div className='flex lg:w-full lg:flex-1 flex-col lg:flex-row gap-2.5 sm:gap-3 py-2.5 sm:py-3 min-w-0'>
					<div className='flex items-center justify-between gap-1 sm:gap-2 min-w-0'>
						<Link href='/' className='shrink-0'>
							<h1 className='font-extrabold text-2xl sm:text-3xl font-mono tracking-tight'>GoCart</h1>
						</Link>
						<div className='flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:hidden shrink-0'>
							<CheckInTrigger variant='mobile' />
							<Link
								href='/documentation'
								className='flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0'
								title='Documentation'
							>
								<BookOpen className='w-3.5 h-3.5' />
								<span className='hidden sm:inline'>Docs</span>
							</Link>
							<ThemeToggle />
							<NotificationBell />
							<UserMenu />
							<Cart />
						</div>
					</div>
					<Search />
				</div>
				<div className='hidden lg:flex w-full lg:w-fit lg:mt-2 justify-end mt-1.5 pl-4 xl:pl-6 items-center gap-1.5 xl:gap-2 shrink-0'>
					<CheckInTrigger variant='header' />
					<Link
						href='/documentation'
						className='flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white shrink-0'
					>
						<BookOpen className='w-3.5 h-3.5' />
						<span className='hidden xl:inline'>Docs</span>
					</Link>
					<div className='hidden xl:flex'>
						<DownloadApp />
					</div>
					<CountryLanguageCurrencySelector userCountry={userCountry} />
					<NotificationBell />
					<UserMenu />
					<ThemeToggle />
					<Cart />
				</div>
			</div>
		</div>
	);
}
