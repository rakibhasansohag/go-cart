import type { Metadata } from 'next';
import { getSiteUrl } from './site-url';

export function publicPageMetadata(path: string, title: string, description: string): Metadata {
	const url = `${getSiteUrl()}${path}`;
	return {
		title, description,
		alternates: { canonical: url },
		openGraph: { title: `${title} | GoCart`, description, url, siteName: 'GoCart', type: 'website', images: ['/opengraph-image'] },
		twitter: { card: 'summary_large_image', title: `${title} | GoCart`, description, images: ['/opengraph-image'] },
	};
}

/** Index curated collections and their pages, excluding arbitrary search/filter combinations. */
export function listingMetadata(path: string, params: Record<string, string | string[] | undefined>, collectionKeys: readonly string[] = []): Pick<Metadata, 'alternates' | 'robots'> {
	const url = new URL(path, getSiteUrl());
	for (const key of collectionKeys) {
		const value = params[key];
		if (typeof value === 'string' && value) url.searchParams.set(key, value);
	}
	const page = params.page;
	if (typeof page === 'string' && /^\d+$/.test(page) && Number.isSafeInteger(Number(page)) && Number(page) > 1) {
		url.searchParams.set('page', String(Number(page)));
	}
	const filtered = Object.entries(params).some(([key, value]) => value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true) && !['page', ...collectionKeys].includes(key));
	return { alternates: { canonical: url.href }, robots: { index: !filtered, follow: true } };
}
