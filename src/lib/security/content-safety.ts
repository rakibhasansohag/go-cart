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
 * an allowed storage host, excluding known active/executable URL formats.
 * File contents, MIME types and provider upload policies need separate controls.
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
	if (parsedUrl.username || parsedUrl.password) {
		throw new Error('Media URLs must not contain credentials.');
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
	let pathname = parsedUrl.pathname.toLowerCase();
	try {
		// Reject encoded active formats, including repeated encoding.
		for (let pass = 0; pass < 4 && /%[0-9a-f]{2}/i.test(pathname); pass++) {
			pathname = decodeURIComponent(pathname);
		}
	} catch {
		throw new Error('Invalid media URL encoding.');
	}
	if (/%[0-9a-f]{2}/i.test(pathname)) {
		throw new Error('Ambiguous media URL encoding.');
	}
	pathname = pathname.toLowerCase();
	for (const ext of DISALLOWED_EXTENSIONS) {
		if (pathname.endsWith(ext)) {
			throw new Error(`Media format '${ext}' is not permitted.`);
		}
	}

	return parsedUrl.toString();
}
