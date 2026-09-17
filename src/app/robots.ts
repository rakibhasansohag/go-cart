import type { MetadataRoute } from 'next';

const getBaseUrl = (): string => {
	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	return 'http://localhost:3000';
};

export default function robots(): MetadataRoute.Robots {
	const baseUrl = getBaseUrl();

	return {
		rules: [
			{
				userAgent: '*',
				allow: ['/', '/browse', '/product/', '/store/'],
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
