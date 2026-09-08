import { describe, expect, it } from 'vitest';
import {
	convertFromUsd,
	formatCurrency,
	formatConvertedPrice,
	formatDualPrice,
} from './converter';
import {
	getCurrencyForCountry,
	isSupportedCurrency,
	SUPPORTED_CURRENCIES,
} from './country-currency-map';
import { getDefaultExchangeRates } from './rates';
import { ExchangeRatesMap } from './types';

const mockRates: ExchangeRatesMap = {
	USD: 1.0,
	BDT: 120.0,
	EUR: 0.92,
	GBP: 0.78,
	CAD: 1.36,
	AUD: 1.5,
	JPY: 155.0,
	INR: 83.5,
	CNY: 7.25,
	SGD: 1.35,
	AED: 3.67,
	SAR: 3.75,
	PKR: 278.5,
};

describe('Multi-Currency System', () => {
	describe('Country to Currency Resolution', () => {
		it('maps Bangladesh to BDT', () => {
			expect(getCurrencyForCountry('BD')).toBe('BDT');
		});

		it('maps United States to USD', () => {
			expect(getCurrencyForCountry('US')).toBe('USD');
		});

		it('maps Eurozone countries to EUR', () => {
			expect(getCurrencyForCountry('DE')).toBe('EUR');
			expect(getCurrencyForCountry('FR')).toBe('EUR');
			expect(getCurrencyForCountry('IT')).toBe('EUR');
			expect(getCurrencyForCountry('ES')).toBe('EUR');
		});

		it('maps United Kingdom to GBP', () => {
			expect(getCurrencyForCountry('GB')).toBe('GBP');
		});

		it('maps Japan to JPY', () => {
			expect(getCurrencyForCountry('JP')).toBe('JPY');
		});

		it('maps India to INR', () => {
			expect(getCurrencyForCountry('IN')).toBe('INR');
		});

		it('defaults to USD for unknown or null codes', () => {
			expect(getCurrencyForCountry(null)).toBe('USD');
			expect(getCurrencyForCountry(undefined)).toBe('USD');
			expect(getCurrencyForCountry('ZZ')).toBe('USD');
		});

		it('validates supported currencies accurately', () => {
			expect(isSupportedCurrency('USD')).toBe(true);
			expect(isSupportedCurrency('BDT')).toBe(true);
			expect(isSupportedCurrency('EUR')).toBe(true);
			expect(isSupportedCurrency('XYZ')).toBe(false);
		});
	});

	describe('Conversion Logic', () => {
		it('leaves USD amounts unchanged when currency is USD', () => {
			expect(convertFromUsd(50.25, 'USD', mockRates)).toBe(50.25);
		});

		it('converts USD to BDT using accurate multiplier', () => {
			// 10 * 120 = 1200
			expect(convertFromUsd(10, 'BDT', mockRates)).toBe(1200);
			// 2.50 * 120 = 300
			expect(convertFromUsd(2.5, 'BDT', mockRates)).toBe(300);
		});

		it('respects zero decimal precision for JPY', () => {
			// 10.5 * 155 = 1627.5 -> rounded to 1628
			const converted = convertFromUsd(10.5, 'JPY', mockRates);
			expect(converted).toBe(1628);
			expect(Number.isInteger(converted)).toBe(true);
		});

		it('safely handles zero and invalid numbers', () => {
			expect(convertFromUsd(0, 'EUR', mockRates)).toBe(0);
			expect(convertFromUsd(NaN, 'EUR', mockRates)).toBe(0);
			expect(convertFromUsd(Infinity, 'EUR', mockRates)).toBe(0);
		});
	});

	describe('Currency Formatting', () => {
		it('formats USD with $ and 2 decimals', () => {
			const formatted = formatCurrency(25.5, 'USD');
			expect(formatted).toContain('25.50');
			expect(formatted).toContain('$');
		});

		it('formats JPY without decimals', () => {
			const formatted = formatCurrency(1628, 'JPY');
			expect(formatted).not.toContain('.00');
			expect(formatted).toContain('1,628');
		});

		it('formats converted prices end-to-end', () => {
			const bdtFormatted = formatConvertedPrice(10, 'BDT', mockRates);
			expect(bdtFormatted).toContain('1,200');
		});
	});

	describe('Dual Price and Base USD Disclosure', () => {
		it('provides single price without disclosure for base USD', () => {
			const dual = formatDualPrice(100, 'USD', mockRates);
			expect(dual.isConverted).toBe(false);
			expect(dual.primary).toContain('100.00');
			expect(dual.disclosure).toBeUndefined();
		});

		it('provides converted primary and base USD disclosure for foreign currencies', () => {
			const dual = formatDualPrice(100, 'BDT', mockRates);
			expect(dual.isConverted).toBe(true);
			expect(dual.primary).toContain('12,000');
			expect(dual.disclosure).toBe('Charged in USD ($100.00)');
			expect(dual.baseAmount).toContain('100.00');
		});
	});

	describe('Fallback Registry Resilience', () => {
		it('provides populated fallback rates when offline', () => {
			const defaults = getDefaultExchangeRates();
			expect(defaults.base).toBe('USD');
			expect(defaults.rates.USD).toBe(1);
			expect(defaults.rates.BDT).toBeGreaterThan(100);
			expect(defaults.rates.EUR).toBeGreaterThan(0.5);
			expect(defaults.source).toBe('fallback');
		});
	});
});
