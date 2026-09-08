import { CurrencyDetails, SupportedCurrency } from './types';

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyDetails> = {
	USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, flag: 'us' },
	BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2, flag: 'bd' },
	EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, flag: 'eu' },
	GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, flag: 'gb' },
	CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, flag: 'ca' },
	AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', decimals: 2, flag: 'au' },
	JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, flag: 'jp' },
	INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, flag: 'in' },
	CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, flag: 'cn' },
	SGD: { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', decimals: 2, flag: 'sg' },
	AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, flag: 'ae' },
	SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', decimals: 2, flag: 'sa' },
	PKR: { code: 'PKR', symbol: 'PKR', name: 'Pakistani Rupee', decimals: 2, flag: 'pk' },
};

const EUROZONE_COUNTRIES = new Set([
	'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
	'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
]);

const COUNTRY_TO_CURRENCY_MAP: Record<string, SupportedCurrency> = {
	BD: 'BDT',
	US: 'USD',
	GB: 'GBP',
	CA: 'CAD',
	AU: 'AUD',
	NZ: 'AUD',
	JP: 'JPY',
	IN: 'INR',
	CN: 'CNY',
	HK: 'CNY',
	SG: 'SGD',
	AE: 'AED',
	SA: 'SAR',
	PK: 'PKR',
};

export function getCurrencyForCountry(countryCode?: string | null): SupportedCurrency {
	if (!countryCode) return 'USD';
	const upper = countryCode.toUpperCase();
	if (EUROZONE_COUNTRIES.has(upper)) return 'EUR';
	return COUNTRY_TO_CURRENCY_MAP[upper] || 'USD';
}

export function isSupportedCurrency(code: string): code is SupportedCurrency {
	return Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, code);
}
