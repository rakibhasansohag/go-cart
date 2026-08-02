import 'server-only';

export const EMAIL_TEMPLATE_VARIABLES = [
	'title',
	'message',
	'orderId',
	'orderGroupId',
	'returnRequestId',
	'storeUrl',
	'nextStatus',
	'provider',
	'providerPaymentId',
] as const;

export type EmailTemplateVariable = (typeof EMAIL_TEMPLATE_VARIABLES)[number];

export type EmailTemplateDefinition = {
	key: string;
	name: string;
	category: string;
	description: string;
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
		subject: 'Payment confirmed for order {{orderId}}',
		preheader: 'Your GoCart payment was successful.',
		bodyHtml:
			'<p>{{message}}</p><p>We have confirmed your payment and your stores can begin preparing the order.</p>',
		ctaLabel: 'View order',
		allowedVariables: commonVariables,
	},
	{
		key: 'package.paid_ready',
		name: 'New paid package',
		category: 'Order',
		description: 'Sent to a seller when a paid package is ready to prepare.',
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
		subject: 'New return request needs review',
		preheader: 'A GoCart customer submitted a return request.',
		bodyHtml:
			'<p>{{message}}</p><p>Review the request and evidence before making a decision.</p>',
		ctaLabel: 'Review return',
		allowedVariables: commonVariables,
	},
];

export function getEmailTemplateDefinition(templateKey: string) {
	return EMAIL_TEMPLATE_DEFINITIONS.find(
		(definition) => definition.key === templateKey,
	);
}

export function getEmailTemplateTestPayload(templateKey: string) {
	return {
		title:
			getEmailTemplateDefinition(templateKey)?.name || 'GoCart notification',
		message: 'This is a safe preview of your GoCart transactional email.',
		orderId: 'ORD-DEMO123',
		orderGroupId: 'PKG-DEMO456',
		returnRequestId: 'RET-DEMO789',
		storeUrl: 'demo-store',
		nextStatus: 'Ready for handoff',
		provider: 'Stripe',
		providerPaymentId: 'pi_demo_123',
		actionUrl: '/dashboard/admin/email-templates',
	};
}
