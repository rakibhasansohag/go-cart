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

const getBaseUrl = (): string => {
	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	return 'http://localhost:3000';
};

/**
 * Generates Schema.org Product structured JSON-LD data.
 */
export const generateProductJsonLd = (input: ProductJsonLdInput): Record<string, unknown> => {
	const baseUrl = getBaseUrl();
	const productUrl = `${baseUrl}/product/${input.slug}`;
	const images = input.images && input.images.length > 0 ? input.images : [`${baseUrl}/og-image.png`];

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

	const price = typeof input.price === 'number' && input.price > 0 ? input.price : 0;
	const currency = input.currency || 'USD';
	const availability = input.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

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
			url: input.storeUrl ? `${baseUrl}/store/${input.storeUrl}` : baseUrl,
		},
	};

	const ratingValue = input.rating && input.rating > 0 ? input.rating : 5;
	const reviewCount = input.numReviews && input.numReviews > 0 ? input.numReviews : (input.reviews?.length || 1);

	schema.aggregateRating = {
		'@type': 'AggregateRating',
		ratingValue: ratingValue.toFixed(1),
		reviewCount,
		bestRating: '5',
		worstRating: '1',
	};

	if (input.reviews && input.reviews.length > 0) {
		schema.review = input.reviews.map((r) => ({
			'@type': 'Review',
			author: {
				'@type': 'Person',
				name: r.authorName || 'Verified Buyer',
			},
			reviewRating: {
				'@type': 'Rating',
				ratingValue: (r.rating || 5).toString(),
				bestRating: '5',
				worstRating: '1',
			},
			reviewBody: r.reviewText || '',
			datePublished: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
		}));
	}

	return schema;
};

/**
 * Generates Schema.org Store / OnlineBusiness structured JSON-LD data.
 */
export const generateStoreJsonLd = (input: StoreJsonLdInput): Record<string, unknown> => {
	const baseUrl = getBaseUrl();
	const storeFullUrl = `${baseUrl}/store/${input.url}`;

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
	const baseUrl = getBaseUrl();

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
	const baseUrl = getBaseUrl();

	const websiteSchema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'GoCart',
		url: baseUrl,
		description: 'GoCart Multi-Vendor Marketplace Platform',
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
			'https://github.com/rakibhasansohag',
		],
	};

	return [websiteSchema, organizationSchema];
};
