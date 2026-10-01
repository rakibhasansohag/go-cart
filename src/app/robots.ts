import { getSiteUrl } from '@/lib/seo/site-url';
import type { MetadataRoute } from 'next';


export default function robots(): MetadataRoute.Robots {
	const baseUrl = getSiteUrl();

	return {
		rules: [
			{
				userAgent: '*',
				allow: ['/', '/browse', '/product/', '/store/', '/documentation/'],
				disallow: [
					'/dashboard/',
					'/profile/',
					'/checkout/',
					'/api/',
					'/sign-in/',
					'/sign-up/',
					'/account-suspended/',
					'/auth-check/',
				],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
