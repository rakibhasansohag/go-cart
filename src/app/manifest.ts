import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'GoCart | Multi-Vendor E-commerce Platform',
		short_name: 'GoCart',
		description: 'Shop independent stores or sell your own products on the GoCart multi-vendor marketplace.',
		start_url: '/',
		display: 'standalone',
		background_color: '#09090b',
		theme_color: '#059669',
		icons: [
			{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
			{ src: '/goCart.svg', sizes: 'any', type: 'image/svg+xml' },
		],
	};
}
