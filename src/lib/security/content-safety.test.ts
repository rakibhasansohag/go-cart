import { describe, it, expect } from 'vitest';
import {
	sanitizeUserText,
	validateSecureMediaUrl,
} from './content-safety';

describe('content-safety', () => {
	describe('sanitizeUserText', () => {
		it('strips script tags and executable attributes from plain text', () => {
			const input = '<script>alert("xss")</script>Hello world<img src=x onerror=alert(1)>';
			const result = sanitizeUserText(input);
			expect(result).toBe('Hello world');
		});

		it('strips HTML when allowFormatting is false (default)', () => {
			const input = '<b>Bold text</b> and <a href="https://evil.com">link</a>';
			const result = sanitizeUserText(input);
			expect(result).toBe('Bold text and link');
		});

		it('permits safe tags with rel=noopener when allowFormatting is true', () => {
			const input = '<p>Check out <a href="https://example.com">this link</a></p>';
			const result = sanitizeUserText(input, { allowFormatting: true });
			expect(result).toContain('rel="noopener noreferrer nofollow"');
			expect(result).toContain('<p>');
			expect(result).toContain('</p>');
		});

		it('strips javascript: pseudo-protocol links even when formatting is allowed', () => {
			const input = '<a href="javascript:alert(1)">Click me</a>';
			const result = sanitizeUserText(input, { allowFormatting: true });
			expect(result).not.toContain('javascript:');
			expect(result).not.toContain('href');
		});

		it('handles empty or blank inputs cleanly', () => {
			expect(sanitizeUserText('')).toBe('');
		});
	});

	describe('validateSecureMediaUrl', () => {
		it('accepts valid Cloudinary HTTPS image URLs', () => {
			const validUrl = 'https://res.cloudinary.com/gocart/image/upload/v12345/product.jpg';
			const result = validateSecureMediaUrl(validUrl);
			expect(result).toBe(validUrl);
		});

		it('accepts Cloudinary subdomains', () => {
			const validUrl = 'https://custom.cloudinary.com/demo/image.png';
			const result = validateSecureMediaUrl(validUrl);
			expect(result).toBe(validUrl);
		});

		it('rejects HTTP (non-secure) URLs', () => {
			const insecureUrl = 'http://res.cloudinary.com/demo/image.jpg';
			expect(() => validateSecureMediaUrl(insecureUrl)).toThrow(
				'Media files must use a secure HTTPS protocol.',
			);
		});

		it('rejects unauthorized third-party hostnames (anti-SSRF)', () => {
			const untrustedUrl = 'https://malicious-site.com/avatar.jpg';
			expect(() => validateSecureMediaUrl(untrustedUrl)).toThrow(
				'Media must originate from an authorized storage host.',
			);
		});

		it('rejects scriptable SVG and HTML extensions', () => {
			const svgUrl = 'https://res.cloudinary.com/demo/exploit.svg';
			expect(() => validateSecureMediaUrl(svgUrl)).toThrow(
				"Media format '.svg' is not permitted.",
			);

			const htmlUrl = 'https://res.cloudinary.com/demo/page.html';
			expect(() => validateSecureMediaUrl(htmlUrl)).toThrow(
				"Media format '.html' is not permitted.",
			);
		});

		it('rejects executable file extensions', () => {
			const exeUrl = 'https://res.cloudinary.com/demo/virus.exe';
			expect(() => validateSecureMediaUrl(exeUrl)).toThrow(
				"Media format '.exe' is not permitted.",
			);
		});

		it('rejects invalid or malformed URL formats', () => {
			expect(() => validateSecureMediaUrl('not-a-url')).toThrow(
				'Invalid media URL format.',
			);
		});
	});
});
