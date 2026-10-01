/** Stable public origin for metadata, structured data, and crawler routes. */
export function getSiteUrl(): string {
	const configured = process.env.NEXT_PUBLIC_APP_URL;
	const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
	const fallback = process.env.NODE_ENV === 'production'
		? 'https://go-cart-iota-eight.vercel.app'
		: 'http://localhost:3000';
	const url = new URL(configured || (productionDomain ? `https://${productionDomain}` : fallback));
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
		throw new Error('The public application URL must be an HTTP(S) origin without credentials.');
	}
	return url.origin;
}
