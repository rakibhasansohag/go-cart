import { describe, expect, it } from 'vitest';
import {
	plainTextFromHtml,
	sanitizeEmailBody,
	validateTemplateVariables,
} from './template-safety';

describe('email template safety', () => {
	it('removes executable markup and unsafe links', () => {
		const clean = sanitizeEmailBody(
			'<p>Hello</p><script>alert(1)</script><a href="javascript:alert(2)">bad</a><a href="https://gocart.example/help">help</a>',
		);

		expect(clean).not.toContain('<script');
		expect(clean).not.toContain('javascript:');
		expect(clean).toContain('https://gocart.example/help');
	});

	it('rejects unknown variables before publishing', () => {
		expect(() =>
			validateTemplateVariables('Hello {{orderId}}', '{{customerPassword}}'),
		).toThrow('Unknown email variable(s): customerPassword');
	});

	it('creates a readable plain-text alternative', () => {
		expect(plainTextFromHtml('<h2>Payment confirmed</h2><p>Thank you.</p>'))
			.toBe('Payment confirmedThank you.');
	});
});
