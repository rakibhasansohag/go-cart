'use client';

// React, Next.js
import { useState } from 'react';

// Icons

import { ChevronDown } from 'lucide-react';

// Types
import { Country, SelectMenuOption } from '@/lib/types';

// Country selector
import CountrySelector from '@/components/shared/country-selector';

// countries data
import countries from '@/data/countries.json';
import { useRouter } from 'next/navigation';

export default function CountryLanguageCurrencySelector({
	userCountry,
}: {
	userCountry: Country;
}) {
	// Router hook for navigation
	const router = useRouter();

	// State to manage countries dropdown visibility
	const [show, setShow] = useState(false);
	const [language, setLanguage] = useState('en');
	const [currency, setCurrency] = useState('BDT');

	const handleCountryClick = async (country: string) => {
		// Find the country data based on the selected country name
		const countryData = countries.find((c) => c.name === country);

		if (countryData) {
			const data: Country = {
				name: countryData.name,
				code: countryData.code,
				city: '',
				region: '',
			};
			try {
				// Send a POST request to your API endpoint to set the cookie
				const response = await fetch('/api/setUserCountryInCookies', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
					},
					body: JSON.stringify({ userCountry: data }),
				});
				if (response.ok) {
					router.refresh();
				}
			} catch (error) {
				console.error('Error setting cookie:', error);
			}
		}
	};

	return (
		<div 
			className='relative inline-block group'
			onMouseLeave={() => setShow(false)}
		>
			{/* Trigger */}
			<div>
				<div className='flex items-center h-11 py-0 px-2 cursor-pointer'>
					<span className='mr-1  h-[38px] grid place-items-center'>
						<span className={`fi fi-${userCountry.code.toLowerCase()}`} />
					</span>
					<div className='ml-1'>
						<span className='block text-xs text-white leading-3 mt-2'>
							{userCountry.name}/EN/
						</span>
						<b className='text-xs font-bold text-white '>
							BDT
							<span className='text-white scale-[60%] align-middle inline-block'>
								<ChevronDown />
							</span>
						</b>
					</div>
				</div>
			</div>
			{/* Content */}
			<div className='absolute hidden top-0 group-hover:block'>
				<div className='relative mt-12 -ml-32 w-[300px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/40 rounded-[24px] text-foreground pt-2 px-6 pb-6 z-50 shadow-lg'>
					{/* Triangle */}
					<div className='w-0 h-0 absolute -top-1.5 right-24 border-l-[10px] border-l-transparent border-b-[10px] border-white dark:border-b-slate-900 border-r-[10px] border-r-transparent' />
					<div className='mt-4 leading-6 text-[20px] font-bold text-foreground'>Ship to</div>
					<div className='mt-2'>
						<div className='relative text-foreground bg-transparent rounded-lg'>
							<CountrySelector
								id={'countries'}
								open={show}
								onToggle={() => setShow(!show)}
								onChange={(val) => handleCountryClick(val)}
								selectedValue={
									(countries.find(
										(option) => option.name === userCountry?.name,
									) as SelectMenuOption) || countries[0]
								}
							/>
							<div>
								<div className='mt-4 leading-6 text-[20px] font-bold text-foreground'>
									Language
								</div>
								<div className='relative mt-2.5 h-10 border-[1px] border-black/20 dark:border-white/20 rounded-lg flex items-center cursor-pointer text-foreground bg-transparent'>
									<select
										value={language}
										onChange={(e) => setLanguage(e.target.value)}
										className='w-full h-full bg-transparent px-3 outline-none cursor-pointer appearance-none text-sm text-foreground pr-8'
									>
										<option value='en' className='bg-white dark:bg-slate-900 text-foreground'>English</option>
										<option value='es' className='bg-white dark:bg-slate-900 text-foreground'>Español</option>
										<option value='fr' className='bg-white dark:bg-slate-900 text-foreground'>Français</option>
									</select>
									<span className='absolute right-2 pointer-events-none'>
										<ChevronDown className='text-foreground scale-75' />
									</span>
								</div>
							</div>
							<div>
								<div className='mt-4 leading-6 text-[20px] font-bold text-foreground'>
									Currency
								</div>
								<div className='relative mt-2 h-10 border-[1px] border-black/20 dark:border-white/20 rounded-lg flex items-center cursor-pointer text-foreground bg-transparent'>
									<select
										value={currency}
										onChange={(e) => setCurrency(e.target.value)}
										className='w-full h-full bg-transparent px-3 outline-none cursor-pointer appearance-none text-sm text-foreground pr-8'
									>
										<option value='BDT' className='bg-white dark:bg-slate-900 text-foreground'>BDT (BD TAKA - বাংলা)</option>
										<option value='USD' className='bg-white dark:bg-slate-900 text-foreground'>USD (US Dollar - $)</option>
										<option value='EUR' className='bg-white dark:bg-slate-900 text-foreground'>EUR (Euro - €)</option>
									</select>
									<span className='absolute right-2 pointer-events-none'>
										<ChevronDown className='text-foreground scale-75' />
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
