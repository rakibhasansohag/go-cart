import { describe, expect, it } from 'vitest';
import { renderEmailTemplate } from './render-email';

describe('renderEmailTemplate', () => {
	it('escapes dynamic content and creates a safe internal action link', async () => {
		process.env.APP_URL = 'https://gocart.example';
		const email = await renderEmailTemplate({
			templateKey: 'package.status_changed',
			payload: {
				title: '<Package ready>',
				message: 'Open <script>alert(1)</script>',
				nextStatus: 'Ready for handoff',
				actionUrl: '/order/order-1',
			},
		});

		expect(email.subject).toBe('Package preparation: Ready for handoff');
		expect(email.html).not.toContain('<script>');
		expect(email.html).toContain('&lt;script&gt;');
		expect(email.html).toContain('https://gocart.example/order/order-1');
		expect(email.text).toContain('https://gocart.example/order/order-1');
	});

	it('rejects external and protocol-relative action URLs', async () => {
		process.env.APP_URL = 'https://gocart.example';
		for (const actionUrl of ['https://evil.example', '//evil.example']) {
			const email = await renderEmailTemplate({
				templateKey: 'package.status_changed',
				payload: { title: 'Update', message: 'Review it', actionUrl },
			});
			expect(email.html).not.toContain('evil.example');
			expect(email.text).not.toContain('evil.example');
		}
	});
});
