import { getSiteUrl } from '@/lib/seo/site-url';
export interface ProductJsonLdInput {
	name: string;
	description?: string | null;
	slug: string;
	images?: string[];
	sku?: string | null;
	brand?: string | null;
	categoryName?: string | null;
	rating?: number | null;
	numReviews?: number | null;
	price?: number | null;
	currency?: string;
	inStock?: boolean;
	storeName?: string | null;
	storeUrl?: string | null;
	reviews?: Array<{
		authorName: string;
		rating: number;
		reviewText?: string | null;
		createdAt?: Date | string;
	}>;
}

export interface StoreJsonLdInput {
	name: string;
	description?: string | null;
	url: string;
	logo?: string | null;
	coverImage?: string | null;
	email?: string | null;
	phone?: string | null;
}

export interface BreadcrumbItem {
	name: string;
	url: string;
}


/**
 * Generates Schema.org Product structured JSON-LD data.
 */
export const generateProductJsonLd = (input: ProductJsonLdInput): Record<string, unknown> => {
	const baseUrl = getSiteUrl();
	const productUrl = `${baseUrl}/product/${encodeURIComponent(input.slug)}`;
	const images = input.images && input.images.length > 0 ? input.images : [`${baseUrl}/opengraph-image`];

	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: input.name,
		description: input.description || input.name,
		url: productUrl,
		image: images,
	};

	if (input.sku) {
		schema.sku = input.sku;
	}

	if (input.brand) {
		schema.brand = {
			'@type': 'Brand',
			name: input.brand,
		};
	}

	if (input.categoryName) {
		schema.category = input.categoryName;
	}

	const price = input.price;
	const currency = input.currency || 'USD';
	const availability = input.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

	if (typeof price === 'number' && Number.isFinite(price) && price >= 0) {
		schema.offers = {
			'@type': 'Offer',
			url: productUrl,
			priceCurrency: currency,
			price: price.toFixed(2),
			availability,
			itemCondition: 'https://schema.org/NewCondition',
			seller: {
				'@type': 'Organization',
				name: input.storeName || 'GoCart Marketplace',
				url: input.storeUrl ? `${baseUrl}/store/${encodeURIComponent(input.storeUrl)}` : baseUrl,
			},
		};
	}

	const ratingValue = input.rating;
	const reviewCount = input.numReviews;

	if (typeof ratingValue === 'number' && Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5 && typeof reviewCount === 'number' && Number.isInteger(reviewCount) && reviewCount > 0) {
		schema.aggregateRating = {
			'@type': 'AggregateRating',
			ratingValue: ratingValue.toFixed(1),
			reviewCount,
			bestRating: '5',
			worstRating: '1',
		};
	}

	const validReviews = input.reviews?.filter(r => Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5);
	if (validReviews && validReviews.length > 0) {
		schema.review = validReviews.map((r) => ({
			'@type': 'Review',
			author: {
				'@type': 'Person',
				name: r.authorName || 'Verified Buyer',
			},
			reviewRating: {
				'@type': 'Rating',
				ratingValue: r.rating.toString(),
				bestRating: '5',
				worstRating: '1',
			},
			reviewBody: r.reviewText || '',
			...(r.createdAt && !Number.isNaN(new Date(r.createdAt).getTime()) ? { datePublished: new Date(r.createdAt).toISOString() } : {}),
		}));
	}

	return schema;
};

/**
 * Generates Schema.org Store / OnlineBusiness structured JSON-LD data.
 */
export const generateStoreJsonLd = (input: StoreJsonLdInput): Record<string, unknown> => {
	const baseUrl = getSiteUrl();
	const storeFullUrl = `${baseUrl}/store/${encodeURIComponent(input.url)}`;

	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Store',
		name: input.name,
		description: input.description || `${input.name} on GoCart Multi-Vendor Marketplace`,
		url: storeFullUrl,
	};

	if (input.logo) {
		schema.image = input.logo;
		schema.logo = input.logo;
	} else if (input.coverImage) {
		schema.image = input.coverImage;
	}

	if (input.email) {
		schema.email = input.email;
	}

	if (input.phone) {
		schema.telephone = input.phone;
	}

	return schema;
};

/**
 * Generates Schema.org BreadcrumbList structured JSON-LD data.
 */
export const generateBreadcrumbJsonLd = (items: BreadcrumbItem[]): Record<string, unknown> => {
	const baseUrl = getSiteUrl();

	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`,
		})),
	};
};

/**
 * Generates Schema.org WebSite & Organization structured JSON-LD data for the root platform.
 */
export const generateWebsiteJsonLd = (): Record<string, unknown>[] => {
	const baseUrl = getSiteUrl();

	const websiteSchema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': `${baseUrl}/#website`,
		name: 'GoCart',
		url: baseUrl,
		description: 'Multi-vendor e-commerce portfolio project by Rakib Hasan Sohag, built with Next.js, TypeScript, Prisma and PostgreSQL.',
		creator: { '@id': `${baseUrl}/#creator` },
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${baseUrl}/browse?search={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	};

	const organizationSchema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'GoCart',
		url: baseUrl,
		logo: `${baseUrl}/goCart.svg`,
		sameAs: [
			'https://github.com/rakibhasansohag/go-cart',
		],
	};

	return [websiteSchema, organizationSchema, {
		'@context': 'https://schema.org', '@type': 'Person', '@id': `${baseUrl}/#creator`,
		name: 'Rakib Hasan Sohag', url: 'https://github.com/rakibhasansohag',
	}, {
		'@context': 'https://schema.org', '@type': 'SoftwareSourceCode', '@id': `${baseUrl}/#source-code`,
		name: 'GoCart', codeRepository: 'https://github.com/rakibhasansohag/go-cart',
		url: `${baseUrl}/about`, programmingLanguage: 'TypeScript', runtimePlatform: 'Next.js',
		author: { '@id': `${baseUrl}/#creator` },
		description: 'Full-stack multi-vendor marketplace with customer, seller and admin roles.',
	}];
};
