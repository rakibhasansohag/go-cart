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

	it('renders a detailed payment receipt from trusted order snapshots', async () => {
		process.env.APP_URL = 'https://gocart.example';
		const email = await renderEmailTemplate({
			templateKey: 'payment.succeeded',
			payload: {
				message: 'Your payment was successful.',
				orderId: 'b8810f34-efed-4c68-8b59-c6dc5ca8304b',
				paymentMethod: 'Stripe',
				paymentReference: 'pi_test_123',
				paidAt: '2026-08-02T04:30:00.000Z',
				subTotal: 999.98,
				shippingFees: 5,
				discountAmount: 100,
				couponCode: 'WELCOME10',
				total: 904.98,
				currency: 'USD',
				itemCount: 2,
				items: [
					{
						name: 'Apex Chronos Premium Timepiece',
						image: 'https://cdn.example.com/watch.jpg',
						sku: 'CAP-001',
						size: 'Standard',
						quantity: 2,
						unitPrice: 499.99,
						totalPrice: 999.98,
						storeName: 'The Crafted Compass',
					},
				],
				actionUrl: '/order/b8810f34-efed-4c68-8b59-c6dc5ca8304b',
			},
		});

		expect(email.subject).toContain('#ORD-CA8304B');
		expect(email.html).toContain('Apex Chronos Premium Timepiece');
		expect(email.html).toContain('Qty 2');
		expect(email.html).toContain('Coupon (WELCOME10)');
		expect(email.html).toContain('-$100.00');
		expect(email.html).toContain('$904.98');
		expect(email.html).toContain('https://cdn.example.com/watch.jpg');
		expect(email.html).toContain('Transaction reference');
		expect(email.html).toContain('PAY-TEST123');
		expect(email.html).not.toContain('pi_test_123');
		expect(email.html).toContain('padding:40px 0');
		expect(email.html).toContain('padding:7px 14px 7px 12px');
		expect(email.text).toContain('Transaction reference: PAY-TEST123');
		expect(email.text).toContain('Total paid: $904.98');
	});

	it.each([
		['package.paid_ready', 'Products to prepare'],
		['package.status_changed', 'Products in this package'],
		['shipment.status_changed', 'Products in this shipment'],
		['return.requested', 'Requested return item'],
	])('renders product details for the %s operational email', async (templateKey, heading) => {
		const email = await renderEmailTemplate({ templateKey });

		expect(email.html).toContain(heading);
		expect(email.html).toContain('Apex Chronos Premium Timepiece');
		expect(email.html).toContain('CAP-OBE-2024-001');
		expect(email.html).toContain('Qty 2');
	});

	it('adds delivery context to shipment emails and request context to return emails', async () => {
		const shipment = await renderEmailTemplate({
			templateKey: 'shipment.status_changed',
		});
		expect(shipment.html).toContain('International Delivery');
		expect(shipment.html).toContain('August 7–12, 2026');

		const returnEmail = await renderEmailTemplate({
			templateKey: 'return.requested',
		});
		expect(returnEmail.html).toContain('Item arrived damaged');
		expect(returnEmail.html).toContain('Estimated refund');
		expect(returnEmail.html).toContain('Customer note');
		expect(returnEmail.html).toContain('visible damage near the clasp');
	});

	it('renders a saved-cart reminder with products, coupon, and checkout link', async () => {
		process.env.APP_URL = 'https://gocart.example';
		const email = await renderEmailTemplate({
			templateKey: 'checkout.abandoned',
		});

		expect(email.html).toContain('Items saved in your cart');
		expect(email.html).toContain('Coupon (WELCOME10)');
		expect(email.html).toContain('https://gocart.example/cart');
		expect(email.text).toContain('Cart total');
	});

	it('renders a payout review email that links only to the protected admin review page', async () => {
		process.env.APP_URL = 'https://gocart.example';
		const email = await renderEmailTemplate({ templateKey: 'payout.batch_ready_for_review' });

		expect(email.subject).toContain('Payout review needed');
		expect(email.html).toContain('No Stripe transfer has been started');
		expect(email.html).toContain('https://gocart.example/dashboard/admin/settlements?batchId=PAY-DEMO123');
		expect(email.html).not.toContain('Approve payout batch');
	});
});
