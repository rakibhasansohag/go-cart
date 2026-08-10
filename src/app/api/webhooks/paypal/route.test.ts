import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handlePayPalEventMock, verifyPayPalWebhookMock } = vi.hoisted(() => ({
	handlePayPalEventMock: vi.fn(),
	verifyPayPalWebhookMock: vi.fn(),
}));

vi.mock('@/lib/payments/paypal-events', () => ({
	handlePayPalEvent: handlePayPalEventMock,
	verifyPayPalWebhook: verifyPayPalWebhookMock,
}));

import { POST } from './route';

const event = {
	id: 'paypal-event-test',
	event_type: 'PAYMENT.CAPTURE.COMPLETED',
	resource: { id: 'capture-test', status: 'COMPLETED' },
};

describe('PayPal webhook route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		verifyPayPalWebhookMock.mockResolvedValue(undefined);
	});

	it('verifies the event before processing it', async () => {
		handlePayPalEventMock.mockResolvedValue({ duplicate: true });

		const request = new Request('http://localhost/api/webhooks/paypal', {
			method: 'POST',
			headers: { 'paypal-transmission-id': 'transmission-test' },
			body: JSON.stringify(event),
		});
		const response = await POST(request);

		expect(verifyPayPalWebhookMock).toHaveBeenCalledWith(request.headers, event);
		expect(handlePayPalEventMock).toHaveBeenCalledWith(event);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ received: true, duplicate: true, ignored: false });
	});

	it('does not process an event when verification fails', async () => {
		verifyPayPalWebhookMock.mockRejectedValue(new Error('PayPal webhook signature verification failed.'));

		const response = await POST(new Request('http://localhost/api/webhooks/paypal', {
			method: 'POST',
			body: JSON.stringify(event),
		}));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'PayPal webhook signature verification failed.' });
		expect(handlePayPalEventMock).not.toHaveBeenCalled();
	});

	it('reports ignored provider events without treating them as failures', async () => {
		handlePayPalEventMock.mockResolvedValue({ ignored: true });

		const response = await POST(new Request('http://localhost/api/webhooks/paypal', {
			method: 'POST',
			body: JSON.stringify(event),
		}));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ received: true, duplicate: false, ignored: true });
	});
});
