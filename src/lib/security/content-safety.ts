import sanitizeHtml from 'sanitize-html';

const DISALLOWED_EXTENSIONS = new Set([
	'.svg',
	'.html',
	'.htm',
	'.xml',
	'.exe',
	'.dll',
	'.sh',
	'.bat',
	'.cmd',
	'.js',
	'.mjs',
	'.cjs',
	'.php',
	'.jsp',
	'.asp',
	'.aspx',
	'.cgi',
]);

const DEFAULT_ALLOWED_HOSTS = new Set([
	'res.cloudinary.com',
]);

/**
 * Sanitizes user-submitted plain or rich text to prevent XSS.
 * When `allowFormatting` is false (default), all HTML tags are stripped.
 * When true, only safe structural tags are permitted.
 */
export function sanitizeUserText(
	rawText: string,
	options: { allowFormatting?: boolean } = {},
): string {
	if (!rawText) return '';

	if (!options.allowFormatting) {
		return sanitizeHtml(rawText, {
			allowedTags: [],
			allowedAttributes: {},
			disallowedTagsMode: 'discard',
		}).trim();
	}

	return sanitizeHtml(rawText, {
		allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
		allowedAttributes: {
			a: ['href', 'target', 'rel'],
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				target: '_blank',
				rel: 'noopener noreferrer nofollow',
			}),
		},
	}).trim();
}

/**
 * Validates that an image or media URL uses HTTPS and originates from
 * an authorized storage provider (e.g., Cloudinary), preventing SSRF,
 * script execution via SVG/HTML, and protocol manipulation.
 */
export function validateSecureMediaUrl(
	rawUrl: string,
	customAllowedHosts?: string[],
): string {
	if (!rawUrl || typeof rawUrl !== 'string') {
		throw new Error('A valid media URL is required.');
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(rawUrl.trim());
	} catch {
		throw new Error('Invalid media URL format.');
	}

	if (parsedUrl.protocol !== 'https:') {
		throw new Error('Media files must use a secure HTTPS protocol.');
	}

	const allowedHosts = new Set(DEFAULT_ALLOWED_HOSTS);
	if (customAllowedHosts) {
		customAllowedHosts.forEach((host) => allowedHosts.add(host.toLowerCase()));
	}

	const hostname = parsedUrl.hostname.toLowerCase();
	const isAllowedHost =
		allowedHosts.has(hostname) ||
		hostname.endsWith('.cloudinary.com');

	if (!isAllowedHost) {
		throw new Error('Media must originate from an authorized storage host.');
	}

	// Check path extension for scriptable/executable vectors
	const pathname = parsedUrl.pathname.toLowerCase();
	for (const ext of DISALLOWED_EXTENSIONS) {
		if (pathname.endsWith(ext)) {
			throw new Error(`Media format '${ext}' is not permitted.`);
		}
	}

	return parsedUrl.toString();
}
