'use server';

import { db } from '@/lib/db';

export const getAllCountries = async () => {
	try {
		return await db.country.findMany({
			orderBy: { createdAt: 'desc' },
		});
	} catch (error) {
		console.error(error);
		return [];
	}
};
