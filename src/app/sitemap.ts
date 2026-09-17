import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { getAllDocSlugs } from '@/lib/docs/docs-data';

const getBaseUrl = (): string => {
	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	return 'http://localhost:3000';
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getBaseUrl();
	const now = new Date();

	const docSlugs = getAllDocSlugs();
	const docRoutes: MetadataRoute.Sitemap = docSlugs.map((slug) => ({
		url: `${baseUrl}/documentation/${slug}`,
		lastModified: now,
		changeFrequency: 'weekly',
		priority: 0.8,
	}));

	const staticRoutes: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 1.0,
		},
		{
			url: `${baseUrl}/documentation`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/browse`,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/cart`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.5,
		},
		{
			url: `${baseUrl}/sign-in`,
			lastModified: now,
			changeFrequency: 'monthly',
			priority: 0.3,
		},
		{
			url: `${baseUrl}/sign-up`,
			lastModified: now,
			changeFrequency: 'monthly',
			priority: 0.3,
		},
		...docRoutes,
	];

	try {
		const [products, stores, categories, subCategories] = await Promise.all([
			db.product.findMany({
				select: {
					slug: true,
					updatedAt: true,
				},
				take: 5000,
			}),
			db.store.findMany({
				where: {
					status: 'ACTIVE',
				},
				select: {
					url: true,
					updatedAt: true,
				},
				take: 1000,
			}),
			db.category.findMany({
				select: {
					url: true,
					updatedAt: true,
				},
			}),
			db.subCategory.findMany({
				select: {
					url: true,
					updatedAt: true,
				},
			}),
		]);

		const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
			url: `${baseUrl}/product/${product.slug}`,
			lastModified: product.updatedAt,
			changeFrequency: 'daily',
			priority: 0.8,
		}));

		const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
			url: `${baseUrl}/store/${store.url}`,
			lastModified: store.updatedAt,
			changeFrequency: 'weekly',
			priority: 0.7,
		}));

		const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
			url: `${baseUrl}/browse?category=${cat.url}`,
			lastModified: cat.updatedAt,
			changeFrequency: 'weekly',
			priority: 0.7,
		}));

		const subCategoryRoutes: MetadataRoute.Sitemap = subCategories.map((subCat) => ({
			url: `${baseUrl}/browse?subCategory=${subCat.url}`,
			lastModified: subCat.updatedAt,
			changeFrequency: 'weekly',
			priority: 0.6,
		}));

		return [...staticRoutes, ...productRoutes, ...storeRoutes, ...categoryRoutes, ...subCategoryRoutes];
	} catch (error) {
		console.error('Failed to generate dynamic sitemap:', error);
		return staticRoutes;
	}
}
