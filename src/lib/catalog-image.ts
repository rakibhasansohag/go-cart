import placeholder from '@/public/assets/images/no_image.png';

const unavailablePhotos = new Set([
	'photo-1608248597359-009f06774641',
	'photo-1580481077195-731da03fed1e',
	'photo-1608248597359-0010996191b7',
]);

export const catalogImageFallback = placeholder;

/** Historical demo URLs that no longer resolve must not leave broken cards. */
export function catalogImageSource(source: string): string {
	try {
		const url = new URL(source);
		if (url.hostname === 'images.unsplash.com' && unavailablePhotos.has(url.pathname.slice(1))) {
			return placeholder.src;
		}
	} catch {
		// Relative app assets are valid sources.
	}
	return source.trim() ? source : placeholder.src;
}
