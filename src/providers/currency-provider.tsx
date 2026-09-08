'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from 'react';
import {
	DualPriceDisplay,
	convertFromUsd,
	formatCurrency,
	formatConvertedPrice,
	formatDualPrice,
} from '@/lib/currency/converter';
import {
	getCurrencyForCountry,
	isSupportedCurrency,
} from '@/lib/currency/country-currency-map';
import { getDefaultExchangeRates } from '@/lib/currency/rates';
import { ExchangeRatesMap, SupportedCurrency } from '@/lib/currency/types';

interface CurrencyContextType {
	currency: SupportedCurrency;
	rates: ExchangeRatesMap;
	isBaseCurrency: boolean;
	setCurrency: (newCurrency: SupportedCurrency) => Promise<void>;
	formatPrice: (usdAmount: number) => string;
	formatDual: (usdAmount: number) => DualPriceDisplay;
	convertPrice: (usdAmount: number) => number;
	disclosure: string;
}

const defaultRatesResult = getDefaultExchangeRates();

const CurrencyContext = createContext<CurrencyContextType>({
	currency: 'USD',
	rates: defaultRatesResult.rates,
	isBaseCurrency: true,
	setCurrency: async () => {},
	formatPrice: (usdAmount: number) => formatCurrency(usdAmount, 'USD'),
	formatDual: (usdAmount: number) => formatDualPrice(usdAmount, 'USD', defaultRatesResult.rates),
	convertPrice: (usdAmount: number) => usdAmount,
	disclosure: 'Charged in USD',
});

function getCookieValue(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
	return match ? decodeURIComponent(match[3]) : null;
}

interface CurrencyProviderProps {
	children: ReactNode;
	initialCurrency?: SupportedCurrency;
	initialRates?: ExchangeRatesMap;
}

export function CurrencyProvider({
	children,
	initialCurrency = 'USD',
	initialRates,
}: CurrencyProviderProps) {
	const [currency, setCurrencyState] = useState<SupportedCurrency>(initialCurrency);
	const [rates, setRates] = useState<ExchangeRatesMap>(
		initialRates || defaultRatesResult.rates,
	);

	useEffect(() => {
		// Read cookie preference first
		const cookieCurrency = getCookieValue('userCurrency');
		if (cookieCurrency && isSupportedCurrency(cookieCurrency)) {
			setCurrencyState(cookieCurrency);
		} else {
			// Try reading userCountry cookie to infer country default
			const countryCookie = getCookieValue('userCountry');
			if (countryCookie) {
				try {
					const parsed = JSON.parse(countryCookie) as { code?: string };
					if (parsed.code) {
						const inferred = getCurrencyForCountry(parsed.code);
						setCurrencyState(inferred);
					}
				} catch {
					// keep initial
				}
			}
		}

		// Fetch fresh exchange rates in background
		fetch('/api/currency/rates')
			.then((res) => (res.ok ? res.json() : null))
			.then((data: { rates?: ExchangeRatesMap } | null) => {
				if (data && data.rates) {
					setRates(data.rates);
				}
			})
			.catch(() => {
				// Silently stay on fallback rates
			});
	}, []);

	const setCurrency = useCallback(async (newCurrency: SupportedCurrency) => {
		if (!isSupportedCurrency(newCurrency)) return;

		setCurrencyState(newCurrency);

		try {
			await fetch('/api/setUserCurrencyInCookies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currency: newCurrency }),
			});
		} catch (error) {
			console.error('Failed to persist currency cookie:', error);
		}
	}, []);

	const formatPrice = useCallback(
		(usdAmount: number) => {
			return formatConvertedPrice(usdAmount, currency, rates);
		},
		[currency, rates],
	);

	const formatDual = useCallback(
		(usdAmount: number) => {
			return formatDualPrice(usdAmount, currency, rates);
		},
		[currency, rates],
	);

	const convertPrice = useCallback(
		(usdAmount: number) => {
			return convertFromUsd(usdAmount, currency, rates);
		},
		[currency, rates],
	);

	const isBaseCurrency = currency === 'USD';
	const disclosure = isBaseCurrency
		? 'Charged in USD'
		: `Charged in USD. Estimated in ${currency}.`;

	return (
		<CurrencyContext.Provider
			value={{
				currency,
				rates,
				isBaseCurrency,
				setCurrency,
				formatPrice,
				formatDual,
				convertPrice,
				disclosure,
			}}
		>
			{children}
		</CurrencyContext.Provider>
	);
}

export function useCurrency(): CurrencyContextType {
	return useContext(CurrencyContext);
}
