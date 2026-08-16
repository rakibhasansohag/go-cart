import 'server-only';

export const EMAIL_TEMPLATE_VARIABLES = [
	'title',
	'message',
	'orderId',
	'orderGroupId',
	'returnRequestId',
	'shipmentId',
	'storeUrl',
	'storeName',
	'nextStatus',
	'shippingService',
	'deliveryEstimate',
	'failureReason',
	'provider',
	'providerPaymentId',
	'paymentMethod',
	'paymentReference',
	'paidAt',
	'subTotal',
	'shippingFees',
	'discountAmount',
	'couponCode',
	'total',
	'currency',
	'itemCount',
	'returnReason',
	'resolution',
	'requestedAmount',
	'customerNote',
	'cartId',
	'payoutBatchId',
	'weekStart',
	'weekEnd',
	'settlementCount',
] as const;

export type EmailTemplateVariable = (typeof EMAIL_TEMPLATE_VARIABLES)[number];

export type EmailTemplateDefinition = {
	key: string;
	name: string;
	category: string;
	description: string;
	audience: string;
	trigger: string;
	subject: string;
	preheader: string;
	bodyHtml: string;
	ctaLabel: string;
	allowedVariables: readonly EmailTemplateVariable[];
};

const commonVariables = EMAIL_TEMPLATE_VARIABLES;

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
	{
		key: 'payment.succeeded',
		name: 'Payment confirmed',
		category: 'Payment',
		description: 'Sent to a customer after a provider-confirmed payment.',
		audience: 'Customer',
		trigger: 'After Stripe or PayPal confirms the payment',
		subject: 'Payment confirmed for order {{orderId}}',
		preheader: '{{total}} {{currency}} paid successfully for {{itemCount}} item(s).',
		bodyHtml:
			'<p>{{message}}</p><p>Your payment is secured and the stores can now begin preparing your items. A detailed receipt is included below.</p>',
		ctaLabel: 'View order',
		allowedVariables: commonVariables,
	},
	{
		key: 'package.paid_ready',
		name: 'New paid package',
		category: 'Order',
		description: 'Sent to a seller when a paid package is ready to prepare.',
		audience: 'Seller',
		trigger: 'After payment clears for a package belonging to the store',
		subject: 'New paid package ready for preparation',
		preheader: 'A paid GoCart package is waiting in your seller dashboard.',
		bodyHtml:
			'<p>{{message}}</p><p>Review the items, accept the package, and move it through each preparation step.</p>',
		ctaLabel: 'Open seller orders',
		allowedVariables: commonVariables,
	},
	{
		key: 'package.status_changed',
		name: 'Package preparation updated',
		category: 'Fulfillment',
		description: 'Sent when seller preparation advances to another step.',
		audience: 'Customer and admin',
		trigger: 'When a seller advances package preparation or hands it off',
		subject: 'Package preparation: {{nextStatus}}',
		preheader: 'Your package preparation status changed.',
		bodyHtml:
			'<p>{{message}}</p><p>We will continue to notify you as this package moves toward delivery.</p>',
		ctaLabel: 'View package',
		allowedVariables: commonVariables,
	},
	{
		key: 'shipment.status_changed',
		name: 'Shipment status updated',
		category: 'Delivery',
		description: 'Sent when logistics or an admin advances a shipment.',
		audience: 'Customer and seller',
		trigger: 'When warehouse, logistics, or an admin changes shipment status',
		subject: 'Shipment update: {{nextStatus}}',
		preheader: 'A GoCart shipment has a new delivery status.',
		bodyHtml:
			'<p>{{message}}</p><p>Open GoCart for the latest package and delivery information.</p>',
		ctaLabel: 'Track delivery',
		allowedVariables: commonVariables,
	},
	{
		key: 'return.requested',
		name: 'Return requested',
		category: 'Returns',
		description: 'Sent to a seller when a customer submits a return request.',
		audience: 'Seller',
		trigger: 'Immediately after a customer submits an eligible return',
		subject: 'New return request needs review',
		preheader: 'A GoCart customer submitted a return request.',
		bodyHtml:
			'<p>{{message}}</p><p>Review the request and evidence before making a decision.</p>',
		ctaLabel: 'Review return',
		allowedVariables: commonVariables,
	},
	{
		key: 'return.status_changed',
		name: 'Return request updated',
		category: 'Returns',
		description: 'Sent to a customer when a seller or admin changes a return request.',
		audience: 'Customer',
		trigger: 'Immediately after a seller or admin makes a return decision',
		subject: 'Return request update: {{nextStatus}}',
		preheader: 'Your GoCart return request status changed.',
		bodyHtml:
			'<p>{{message}}</p><p>Open GoCart to review the latest return timeline and next steps.</p>',
		ctaLabel: 'View return request',
		allowedVariables: commonVariables,
	},
	{
		key: 'checkout.abandoned',
		name: 'Abandoned checkout reminder',
		category: 'Cart',
		description: 'Sent when a saved checkout remains inactive.',
		audience: 'Customer',
		trigger: 'After a saved cart remains inactive for the configured delay',
		subject: 'Your GoCart items are still waiting',
		preheader: '{{itemCount}} saved item(s) are ready when you are.',
		bodyHtml:
			'<p>{{message}}</p><p>Your prices and availability will be checked again when you return to checkout.</p>',
		ctaLabel: 'Return to cart',
		allowedVariables: commonVariables,
	},
	{
		key: 'payout.batch_ready_for_review',
		name: 'Weekly payout batch needs review',
		category: 'Marketplace operations',
		description: 'Sent to platform admins when the scheduled weekly payout batch contains eligible seller funds.',
		audience: 'Admin',
		trigger: 'The weekly payout review job creates or finds a draft batch with eligible settlements',
		subject: 'Payout review needed: {{settlementCount}} seller settlement(s)',
		preheader: '{{total}} {{currency}} is ready for your review; no transfer has been started.',
		bodyHtml:
			'<p>{{message}}</p><p>Open the protected admin review screen to inspect the delivery evidence, seller amounts, and transfer readiness. The email link cannot approve or send money.</p>',
		ctaLabel: 'Review payout batch',
		allowedVariables: commonVariables,
	},
];

export function getEmailTemplateDefinition(templateKey: string) {
	return EMAIL_TEMPLATE_DEFINITIONS.find(
		(definition) => definition.key === templateKey,
	);
}

export function getEmailTemplateTestPayload(templateKey: string) {
	const basePayload = {
		title:
			getEmailTemplateDefinition(templateKey)?.name || 'GoCart notification',
		message: 'This is a safe preview using realistic demonstration data.',
		orderId: 'ORD-DEMO123',
		orderGroupId: 'PKG-DEMO456',
		returnRequestId: 'RET-DEMO789',
		shipmentId: 'SHP-DEMO321',
		storeUrl: 'demo-store',
		storeName: 'The Crafted Compass',
		nextStatus: '',
		shippingService: 'International Delivery',
		deliveryEstimate: 'August 7–12, 2026',
		failureReason: '',
		provider: 'Stripe',
		providerPaymentId: 'pi_demo_123',
		paymentMethod: 'Stripe',
		paymentReference: 'pi_demo_123',
		paidAt: 'August 2, 2026 at 10:30 AM',
		subTotal: '999.98',
		shippingFees: '5.00',
		discountAmount: '100.00',
		couponCode: 'WELCOME10',
		total: '904.98',
		currency: 'USD',
		itemCount: '2',
		returnReason: 'Item arrived damaged',
		resolution: 'Refund',
		requestedAmount: '299.99',
		customerNote: 'The item arrived with visible damage near the clasp.',
		cartId: 'CART-DEMO123',
		payoutBatchId: 'PAY-DEMO123',
		weekStart: 'August 10, 2026',
		weekEnd: 'August 16, 2026',
		settlementCount: '3',
		items: [
			{
				name: 'Apex Chronos Premium Timepiece',
				image:
					'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=160&q=80',
				sku: 'CAP-OBE-2024-001',
				size: 'Standard',
				quantity: 2,
				unitPrice: 499.99,
				totalPrice: 999.98,
				storeName: 'The Crafted Compass',
			},
		],
		actionUrl: '/order/demo-order',
	};

	switch (templateKey) {
		case 'payment.succeeded':
			return {
				...basePayload,
				message:
					'We received your Stripe payment and confirmed your GoCart order.',
			};
		case 'package.paid_ready':
			return {
				...basePayload,
				message:
					'A customer payment cleared and this package is ready for your store to accept.',
				nextStatus: 'Awaiting acceptance',
			};
		case 'package.status_changed':
			return {
				...basePayload,
				message:
					'The store finished preparing your package and marked it ready for handoff.',
				nextStatus: 'Ready for handoff',
			};
		case 'shipment.status_changed':
			return {
				...basePayload,
				message:
					'Your shipment left the local hub and is now out for delivery.',
				nextStatus: 'Out for delivery',
			};
		case 'return.requested':
			return {
				...basePayload,
				message:
					'A customer requested a refund for one delivered item and attached return details.',
				nextStatus: 'Requested',
			};
		case 'return.status_changed':
			return {
				...basePayload,
				message: 'The seller reviewed your return request and updated its status.',
				nextStatus: 'Approved',
				actionUrl: '/profile/returns/RET-DEMO789',
			};
		case 'checkout.abandoned':
			return {
				...basePayload,
				message: 'Your saved GoCart checkout has been waiting for you.',
				nextStatus: 'Saved cart',
				actionUrl: '/cart',
			};
		case 'payout.batch_ready_for_review':
			return {
				...basePayload,
				message: 'Three eligible seller settlements are ready for your approval. No Stripe transfer has been started.',
				actionUrl: '/dashboard/admin/settlements?batchId=PAY-DEMO123',
			};
		default:
			return basePayload;
	}
}
