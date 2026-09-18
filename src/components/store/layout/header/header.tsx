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
		<div className='bg-gradient-to-r from-slate-500 to-slate-800 sticky top-0 z-50 shadow-sm'>
			<div className='h-full w-full lg:flex text-white px-4 lg:px-12'>
				<div className='flex lg:w-full lg:flex-1 flex-col lg:flex-row gap-3 py-3'>
					<div className='flex items-center justify-between'>
						<Link href='/'>
							<h1 className='font-extrabold text-3xl font-mono'>GoCart</h1>
						</Link>
						<div className='flex items-center gap-2 lg:hidden'>
							<CheckInTrigger variant='mobile' />
							<Link
								href='/documentation'
								className='flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white'
								title='Documentation'
							>
								<BookOpen className='w-3.5 h-3.5' />
								<span>Docs</span>
							</Link>
							<ThemeToggle />
							<NotificationBell />
							<UserMenu />
							<Cart />
						</div>
					</div>
					<Search />
				</div>
				<div className='hidden lg:flex w-full lg:w-fit lg:mt-2 justify-end mt-1.5 pl-6 items-center gap-2'>
					<CheckInTrigger variant='header' />
					<Link
						href='/documentation'
						className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white'
					>
						<BookOpen className='w-3.5 h-3.5' />
						<span>Docs</span>
					</Link>
					<div className='lg:flex'>
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
