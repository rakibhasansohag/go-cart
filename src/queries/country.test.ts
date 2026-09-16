import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	db: {
		country: {
			findMany: vi.fn(),
		},
	},
}));

vi.mock('@/lib/db', () => ({ db: harness.db }));

import { getAllCountries } from './country';

describe('getAllCountries query', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns a list of countries ordered by createdAt descending', async () => {
		const mockCountries = [
			{ id: 'c1', name: 'United States', code: 'US', createdAt: new Date('2026-01-02') },
			{ id: 'c2', name: 'Bangladesh', code: 'BD', createdAt: new Date('2026-01-01') },
		];

		harness.db.country.findMany.mockResolvedValue(mockCountries);

		const result = await getAllCountries();

		expect(harness.db.country.findMany).toHaveBeenCalledWith({
			orderBy: { createdAt: 'desc' },
		});
		expect(result).toEqual(mockCountries);
	});

	it('gracefully returns an empty array when database throws an error', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		harness.db.country.findMany.mockRejectedValue(new Error('Database connection failed'));

		const result = await getAllCountries();

		expect(result).toEqual([]);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
