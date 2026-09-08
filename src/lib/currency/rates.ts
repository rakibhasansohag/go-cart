import fallbackData from './fallback-rates.json';
import { ExchangeRateResult, ExchangeRatesMap, SupportedCurrency } from './types';
import { isSupportedCurrency } from './country-currency-map';

let inMemoryCache: {
	rates: ExchangeRatesMap;
	base: string;
	fetchedAt: string;
	expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getDefaultExchangeRates(): ExchangeRateResult {
	return {
		base: fallbackData.base,
		fetchedAt: fallbackData.fetchedAt,
		rates: fallbackData.rates as ExchangeRatesMap,
		source: 'fallback',
	};
}

export async function getExchangeRates(): Promise<ExchangeRateResult> {
	const now = Date.now();

	if (inMemoryCache && inMemoryCache.expiresAt > now) {
		return {
			base: inMemoryCache.base,
			fetchedAt: inMemoryCache.fetchedAt,
			rates: inMemoryCache.rates,
			source: 'api',
		};
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3500);

		const response = await fetch('https://open.er-api.com/v6/latest/USD', {
			signal: controller.signal,
			next: { revalidate: 86400 }, // Cache on Next.js fetch layer for 24 hours
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`Exchange rate provider responded with status ${response.status}`);
		}

		const data = (await response.json()) as {
			result?: string;
			base_code?: string;
			rates?: Record<string, number>;
			time_last_update_utc?: string;
		};

		if (data.result === 'success' && data.rates) {
			const sanitizedRates: Partial<ExchangeRatesMap> = {
				USD: 1.0,
			};

			const fallbackRates = fallbackData.rates as ExchangeRatesMap;

			for (const key of Object.keys(fallbackRates) as SupportedCurrency[]) {
				if (typeof data.rates[key] === 'number' && !isNaN(data.rates[key])) {
					sanitizedRates[key] = data.rates[key];
				} else {
					sanitizedRates[key] = fallbackRates[key];
				}
			}

			const fullRates = sanitizedRates as ExchangeRatesMap;
			const fetchedAt = data.time_last_update_utc || new Date().toISOString();

			inMemoryCache = {
				base: 'USD',
				fetchedAt,
				rates: fullRates,
				expiresAt: now + CACHE_TTL_MS,
			};

			return {
				base: 'USD',
				fetchedAt,
				rates: fullRates,
				source: 'api',
			};
		}
	} catch (error) {
		// Log operational alert and safely fall back
		console.warn('Unable to fetch live exchange rates, falling back to local registry:', error);
	}

	return getDefaultExchangeRates();
}
