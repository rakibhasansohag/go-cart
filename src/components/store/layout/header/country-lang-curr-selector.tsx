'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

import { Country, SelectMenuOption } from '@/lib/types';
import { SupportedCurrency } from '@/lib/currency/types';
import CountrySelector from '@/components/shared/country-selector';
import countries from '@/data/countries.json';
import { useCurrency } from '@/providers/currency-provider';
import {
	SUPPORTED_CURRENCIES,
	getCurrencyForCountry,
	isSupportedCurrency,
} from '@/lib/currency/country-currency-map';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CountryLanguageCurrencySelectorProps {
	userCountry: Country;
	variant?: 'header' | 'mobile';
}

export default function CountryLanguageCurrencySelector({
	userCountry,
	variant = 'header',
}: CountryLanguageCurrencySelectorProps) {
	const { currency, setCurrency } = useCurrency();

	const [isOpen, setIsOpen] = useState(false);
	const [countrySelectorOpen, setCountrySelectorOpen] = useState(false);
	const [language, setLanguage] = useState('en');
	const [currentCountry, setCurrentCountry] = useState<Country>(userCountry);

	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Sync with server prop if it changes
	useEffect(() => {
		setCurrentCountry(userCountry);
	}, [userCountry]);

	const clearHoverTimeout = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	};

	const handleMouseEnter = () => {
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
			clearHoverTimeout();
			setIsOpen(true);
		}
	};

	const handleMouseLeave = () => {
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
			clearHoverTimeout();
			timeoutRef.current = setTimeout(() => {
				setIsOpen(false);
				setCountrySelectorOpen(false);
			}, 250);
		}
	};

	useEffect(() => {
		return () => {
			clearHoverTimeout();
		};
	}, []);

	const handleTriggerClick = (e: React.MouseEvent) => {
		e.preventDefault();
		clearHoverTimeout();
		setIsOpen((prev) => {
			if (prev) setCountrySelectorOpen(false);
			return !prev;
		});
	};

	// Optimistic, instant country & currency update (0ms UI feedback)
	const handleCountryClick = (country: string) => {
		const countryData = countries.find((c) => c.name === country);
		if (!countryData) return;

		const data: Country = {
			name: countryData.name,
			code: countryData.code,
			city: '',
			region: '',
		};

		// 1. INSTANT optimistic UI update
		setCurrentCountry(data);

		// 2. Immediately close inner dropdown
		setCountrySelectorOpen(false);

		// 3. INSTANT currency update across the entire app
		const inferredCurrency = getCurrencyForCountry(countryData.code);
		if (inferredCurrency && isSupportedCurrency(inferredCurrency)) {
			setCurrency(inferredCurrency);
		}

		// 4. Persist cookie in background without blocking the UI
		fetch('/api/setUserCountryInCookies', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({ userCountry: data }),
		}).catch((error) => {
			console.error('Error setting country cookie:', error);
		});
	};

	const handleCurrencyChange = (newCode: string) => {
		if (isSupportedCurrency(newCode)) {
			setCurrency(newCode as SupportedCurrency);
		}
	};

	return (
		<div
			className='relative inline-block'
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<Popover
				open={isOpen}
				onOpenChange={(open) => {
					clearHoverTimeout();
					setIsOpen(open);
					if (!open) setCountrySelectorOpen(false);
				}}
			>
				<PopoverTrigger asChild>
					{variant === 'mobile' ? (
						<button
							type='button'
							onClick={handleTriggerClick}
							aria-label={`Ship to: ${currentCountry.name}, ${currency}`}
							aria-expanded={isOpen}
							className='flex items-center justify-center size-8 sm:size-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors border-none outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer shrink-0'
							title={`Ship to: ${currentCountry.name} (${currency})`}
						>
							<span
								className={`fi fi-${currentCountry.code.toLowerCase()} text-base rounded-xs`}
							/>
						</button>
					) : (
						<button
							type='button'
							onClick={handleTriggerClick}
							aria-label={`Ship to: ${currentCountry.name}, ${currency}`}
							aria-expanded={isOpen}
							className='flex items-center h-11 py-0 px-2 cursor-pointer text-white border-none outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg select-none transition-opacity hover:opacity-90 text-left'
						>
							<span className='mr-1.5 h-[38px] grid place-items-center shrink-0'>
								<span
									className={`fi fi-${currentCountry.code.toLowerCase()} text-lg rounded-xs`}
								/>
							</span>
							<div className='ml-1'>
								<span className='block text-xs text-white/80 leading-3 mt-1'>
									{currentCountry.name}/EN/
								</span>
								<b className='text-xs font-bold text-white flex items-center gap-0.5 leading-4'>
									<span>{currency}</span>
									<span
										className={cn(
											'text-white scale-[60%] align-middle inline-block transition-transform duration-200',
											isOpen && 'rotate-180',
										)}
									>
										<ChevronDown />
									</span>
								</b>
							</div>
						</button>
					)}
				</PopoverTrigger>

				<PopoverContent
					align='end'
					sideOffset={8}
					collisionPadding={16}
					className='w-auto p-0 border-none bg-transparent shadow-none z-50 focus:outline-none'
				>
					{/* Invisible hover bridge to prevent cursor gap drop */}
					<div
						className='absolute -top-3 left-0 right-0 h-4 bg-transparent'
						onMouseEnter={handleMouseEnter}
					/>
					<div
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
						className='w-[320px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 rounded-[24px] text-foreground pt-3 px-6 pb-6 shadow-2xl backdrop-blur-md transition-all'
					>
						<div className='mt-2 leading-6 text-xl font-bold text-foreground'>
							Ship to
						</div>

						{/* Country Selector */}
						<div className='mt-2.5'>
							<div className='relative text-foreground bg-transparent rounded-lg'>
								<CountrySelector
									id={'countries'}
									open={countrySelectorOpen}
									onToggle={() => setCountrySelectorOpen((prev) => !prev)}
									onClose={() => setCountrySelectorOpen(false)}
									onChange={(val) => handleCountryClick(val)}
									selectedValue={
										(countries.find(
											(option) => option.name === currentCountry?.name,
										) as SelectMenuOption) || countries[0]
									}
								/>

								{/* Language Selector */}
								<div>
									<div className='mt-4 flex items-center justify-between'>
										<span className='leading-6 text-xl font-bold text-foreground'>
											Language
										</span>
										<span className='text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'>
											Coming Soon
										</span>
									</div>
									<div className='relative mt-2.5 h-10 border border-black/20 dark:border-white/20 rounded-lg flex items-center text-foreground bg-slate-50/50 dark:bg-slate-800/30'>
										<select
											value={language}
											onChange={(e) => {
												if (e.target.value === 'en') {
													setLanguage(e.target.value);
												}
											}}
											className='w-full h-full bg-transparent px-3 outline-none appearance-none text-sm text-foreground pr-8'
										>
											<option
												value='en'
												className='bg-white dark:bg-slate-900 text-foreground'
											>
												English (Default)
											</option>
											<option
												value='es'
												disabled
												className='bg-white dark:bg-slate-900 text-muted-foreground'
											>
												Español (Coming Soon)
											</option>
											<option
												value='fr'
												disabled
												className='bg-white dark:bg-slate-900 text-muted-foreground'
											>
												Français (Coming Soon)
											</option>
										</select>
										<span className='absolute right-2 pointer-events-none'>
											<ChevronDown className='text-foreground scale-75' />
										</span>
									</div>
									<p className='mt-1.5 text-xs text-muted-foreground'>
										Multi-language support is coming soon.
									</p>
								</div>

								{/* Currency Selector */}
								<div>
									<div className='mt-4 leading-6 text-xl font-bold text-foreground'>
										Currency
									</div>
									<div className='relative mt-2.5 h-10 border border-black/20 dark:border-white/20 rounded-lg flex items-center cursor-pointer text-foreground bg-transparent'>
										<select
											value={currency}
											onChange={(e) => handleCurrencyChange(e.target.value)}
											className='w-full h-full bg-transparent px-3 outline-none cursor-pointer appearance-none text-sm text-foreground pr-8'
										>
											{Object.values(SUPPORTED_CURRENCIES).map((curr) => (
												<option
													key={curr.code}
													value={curr.code}
													className='bg-white dark:bg-slate-900 text-foreground'
												>
													{curr.code} ({curr.name} - {curr.symbol})
												</option>
											))}
										</select>
										<span className='absolute right-2 pointer-events-none'>
											<ChevronDown className='text-foreground scale-75' />
										</span>
									</div>
									{currency !== 'USD' && (
										<p className='mt-1.5 text-xs text-muted-foreground'>
											Orders are charged in USD. Prices in {currency} are estimated.
										</p>
									)}
								</div>
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
