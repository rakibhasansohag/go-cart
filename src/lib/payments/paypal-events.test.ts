import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { paypalRequestMock } = vi.hoisted(() => ({
	paypalRequestMock: vi.fn(),
}));

vi.mock('./paypal-client', () => ({
	paypalRequest: paypalRequestMock,
}));

vi.mock('@/lib/db', () => ({
	db: {},
}));

vi.mock('./reconcile', () => ({
	reconcilePaymentEvent: vi.fn(),
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {},
	publishDomainEvent: vi.fn(),
}));

vi.mock('@/lib/email/schedule', () => ({
	scheduleEmailOutboxDispatch: vi.fn(),
}));

import { verifyPayPalWebhook } from './paypal-events';

const event = {
	id: 'paypal-event-test',
	event_type: 'PAYMENT.CAPTURE.COMPLETED',
	resource: { id: 'capture-test' },
};

describe('PayPal webhook verification', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.PAYPAL_WEBHOOK_ID = 'webhook-test';
		paypalRequestMock.mockResolvedValue({ verification_status: 'SUCCESS' });
	});

	afterEach(() => {
		delete process.env.PAYPAL_WEBHOOK_ID;
	});

	it('sends PayPal transmission headers and event data to verification', async () => {
		const headers = new Headers({
			'paypal-auth-algo': 'SHA256withRSA',
			'paypal-cert-url': 'https://api.paypal.test/cert',
			'paypal-transmission-id': 'transmission-test',
			'paypal-transmission-sig': 'signature-test',
			'paypal-transmission-time': '2026-08-10T00:00:00Z',
		});

		await expect(verifyPayPalWebhook(headers, event)).resolves.toBeUndefined();
		expect(paypalRequestMock).toHaveBeenCalledWith(
			'/v1/notifications/verify-webhook-signature',
			expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('webhook-test'),
			}),
		);
		const requestBody = JSON.parse(paypalRequestMock.mock.calls[0][1].body);
		expect(requestBody.auth_algo).toBe('SHA256withRSA');
		expect(requestBody.transmission_sig).toBe('signature-test');
		expect(requestBody.webhook_event).toEqual(event);
	});

	it('rejects a failed PayPal verification response', async () => {
		paypalRequestMock.mockResolvedValue({ verification_status: 'FAILURE' });

		await expect(verifyPayPalWebhook(new Headers(), event)).rejects.toThrow(
			'PayPal webhook signature verification failed.',
		);
	});

	it('fails closed when the webhook ID is missing', async () => {
		delete process.env.PAYPAL_WEBHOOK_ID;

		await expect(verifyPayPalWebhook(new Headers(), event)).rejects.toThrow(
			'PAYPAL_WEBHOOK_ID is not configured.',
		);
		expect(paypalRequestMock).not.toHaveBeenCalled();
	});
});
