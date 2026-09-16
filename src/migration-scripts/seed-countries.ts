import countries from '@/data/countries.json';
import { db } from '@/lib/db';
export async function seedCountries() {
	try {
		await Promise.all(
			countries.map((country) =>
				db.country.upsert({
					where: {
						name: country.name,
					},
					create: {
						name: country.name,
						code: country.code,
					},
					update: {
						name: country.name,
						code: country.code,
					},
				}),
			),
		);
	} catch (error) {
		console.error('Error seeding countries:', error);
	}
}
