import { SUPPORTED_CURRENCIES } from './country-currency-map';
import { ExchangeRatesMap, SupportedCurrency } from './types';

export function convertFromUsd(
	amountInUsd: number,
	targetCurrency: SupportedCurrency,
	rates: ExchangeRatesMap,
): number {
	if (isNaN(amountInUsd) || !isFinite(amountInUsd)) return 0;
	if (targetCurrency === 'USD') return amountInUsd;

	const rate = rates[targetCurrency] || 1;
	const converted = amountInUsd * rate;

	const meta = SUPPORTED_CURRENCIES[targetCurrency];
	const decimals = meta ? meta.decimals : 2;

	const factor = Math.pow(10, decimals);
	return Math.round(converted * factor) / factor;
}

export function formatCurrency(
	amount: number,
	currency: SupportedCurrency = 'USD',
): string {
	if (isNaN(amount) || !isFinite(amount)) return '$0.00';

	const meta = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
	const decimals = meta.decimals;

	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(amount);
	} catch {
		return `${meta.symbol}${amount.toFixed(decimals)}`;
	}
}

export function formatConvertedPrice(
	amountInUsd: number,
	targetCurrency: SupportedCurrency,
	rates: ExchangeRatesMap,
): string {
	const converted = convertFromUsd(amountInUsd, targetCurrency, rates);
	return formatCurrency(converted, targetCurrency);
}

export interface DualPriceDisplay {
	primary: string;
	secondary?: string;
	disclosure?: string;
	isConverted: boolean;
	baseAmount: string;
}

export function formatDualPrice(
	amountInUsd: number,
	targetCurrency: SupportedCurrency,
	rates: ExchangeRatesMap,
): DualPriceDisplay {
	const baseAmount = formatCurrency(amountInUsd, 'USD');
	if (targetCurrency === 'USD') {
		return {
			primary: baseAmount,
			isConverted: false,
			baseAmount,
		};
	}

	const primary = formatConvertedPrice(amountInUsd, targetCurrency, rates);
	return {
		primary,
		secondary: baseAmount,
		disclosure: `Charged in USD (${baseAmount})`,
		isConverted: true,
		baseAmount,
	};
}
