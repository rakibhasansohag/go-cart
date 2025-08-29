import Link from 'next/link';
import UserMenu from './user-menu/user-menu';
import DownloadApp from './download-app';
import Search from './search/search';
import { cookies } from 'next/headers';
import { Country } from '@/lib/types';

import CountryLanguageCurrencySelector from './country-lang-curr-selector';

export default async function Header() {
	// Get cookies from the store
	const cookieStore = cookies();
	const userCountryCookie = (await cookieStore).get('userCountry');

	// Set default country if cookie is missing
	let userCountry: Country = {
		name: 'Bangladesh',
		city: '',
		code: 'BD',
		region: '',
	};

	// If cookie exists, update the user country
	if (userCountryCookie) {
		userCountry = JSON.parse(userCountryCookie.value) as Country;
	}

	return (
		<div className='bg-gradient-to-r from-slate-500 to-slate-800'>
			<div className='h-full w-full lg:flex text-white px-4 lg:px-12'>
				<div className='flex lg:w-full lg:flex-1 flex-col lg:flex-row gap-3 py-3'>
					<div className='flex items-center justify-between'>
						<Link href='/'>
							<h1 className='font-extrabold text-3xl font-mono'>GoShop</h1>
						</Link>
						<div className='flex lg:hidden'>
							<UserMenu />
						</div>
					</div>
					<Search />
				</div>
				<div className='hidden lg:flex w-full lg:w-fit lg:mt-2 justify-end mt-1.5 pl-6'>
					<div className='lg:flex'>
						<DownloadApp />
					</div>
					<CountryLanguageCurrencySelector userCountry={userCountry} />
					<UserMenu />
				</div>
			</div>
		</div>
	);
}
