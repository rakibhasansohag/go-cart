import { getSiteUrl } from '@/lib/seo/site-url';
import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { getAllDocSlugs } from '@/lib/docs/docs-data';


// Refresh public catalog URLs as sellers update the marketplace.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getSiteUrl();


	const docSlugs = getAllDocSlugs();
	const docRoutes: MetadataRoute.Sitemap = docSlugs.map((slug) => ({
		url: `${baseUrl}/documentation/${slug}`,
		changeFrequency: 'weekly',
		priority: 0.8,
	}));

	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: `${baseUrl}/stores`, changeFrequency: 'daily', priority: 0.9 },
		{
			url: baseUrl,
			changeFrequency: 'daily',
			priority: 1.0,
		},
		{
			url: `${baseUrl}/browse`,
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/about`,
			changeFrequency: 'monthly',
			priority: 0.7,
		},
		{
			url: `${baseUrl}/contact`,
			changeFrequency: 'monthly',
			priority: 0.7,
		},
		{
			url: `${baseUrl}/faq`,
			changeFrequency: 'weekly',
			priority: 0.7,
		},
		{
			url: `${baseUrl}/privacy`,
			changeFrequency: 'yearly',
			priority: 0.4,
		},
		{
			url: `${baseUrl}/terms`,
			changeFrequency: 'yearly',
			priority: 0.4,
		},
		...docRoutes,
	];

	try {
		const [products, stores, categories, subCategories] = await Promise.all([
			db.product.findMany({
				where: { store: { status: 'ACTIVE' } },
				orderBy: { id: 'asc' },
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
				orderBy: { id: 'asc' },
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
			url: `${baseUrl}/product/${encodeURIComponent(product.slug)}`,
			lastModified: product.updatedAt,
			changeFrequency: 'daily',
			priority: 0.8,
		}));

		const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
			url: `${baseUrl}/store/${encodeURIComponent(store.url)}`,
			lastModified: store.updatedAt,
			changeFrequency: 'weekly',
			priority: 0.7,
		}));

		const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
			url: `${baseUrl}/browse?category=${encodeURIComponent(cat.url)}`,
			lastModified: cat.updatedAt,
			changeFrequency: 'weekly',
			priority: 0.7,
		}));

		const subCategoryRoutes: MetadataRoute.Sitemap = subCategories.map((subCat) => ({
			url: `${baseUrl}/browse?subCategory=${encodeURIComponent(subCat.url)}`,
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
