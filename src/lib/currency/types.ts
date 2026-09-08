export type SupportedCurrency =
	| 'USD'
	| 'BDT'
	| 'EUR'
	| 'GBP'
	| 'CAD'
	| 'AUD'
	| 'JPY'
	| 'INR'
	| 'CNY'
	| 'SGD'
	| 'AED'
	| 'SAR'
	| 'PKR';

export interface CurrencyDetails {
	code: SupportedCurrency;
	symbol: string;
	name: string;
	decimals: number;
	flag: string;
}

export type ExchangeRatesMap = Record<SupportedCurrency, number>;

export interface ExchangeRateResult {
	rates: ExchangeRatesMap;
	base: string;
	fetchedAt: string;
	source: 'database' | 'api' | 'fallback';
}
