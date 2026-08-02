import 'server-only';

import { db } from '@/lib/db';
import { EmailTemplateSource, type Prisma } from '@prisma/client';
import mjml2html from 'mjml';
import sanitizeHtml from 'sanitize-html';
import { formatOrderId, formatPackageId } from '@/lib/orders/references';
import {
	getEmailTemplateDefinition,
	getEmailTemplateTestPayload,
} from './templates';
import {
	plainTextFromHtml,
	sanitizeEmailBody,
	validateTemplateVariables,
} from './template-safety';

type Payload = Record<string, unknown>;

export type EditableEmailTemplate = {
	subject: string;
	preheader: string;
	bodyHtml: string;
	ctaLabel: string;
	enabled: boolean;
};

function payloadRecord(payload: Prisma.JsonValue | Payload): Payload {
	if (!payload || Array.isArray(payload) || typeof payload !== 'object') return {};
	return payload as Payload;
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function interpolate(value: string, payload: Payload) {
	return value.replace(
		/{{\s*([a-zA-Z0-9_]+)\s*}}/g,
		(_match, key: string) => escapeHtml(String(payload[key] ?? '')),
	);
}

function safeActionUrl(payload: Payload) {
	const path = typeof payload.actionUrl === 'string' ? payload.actionUrl : '';
	if (!path.startsWith('/') || path.startsWith('//')) return null;
	const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
	if (!baseUrl) return null;
	try {
		return new URL(path, baseUrl).toString();
	} catch {
		return null;
	}
}

function cleanHeaderText(value: string) {
	return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
		.replace(/\s+/g, ' ')
		.trim();
}

function displayReference(value: unknown, type: 'order' | 'package') {
	if (typeof value !== 'string' || !value) return '';
	if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) return value;
	return type === 'order' ? formatOrderId(value) : formatPackageId(value);
}

function safeImageUrl(value: unknown) {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url.toString() : null;
	} catch {
		return null;
	}
}

function amountValue(value: unknown) {
	const amount = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: unknown, currency: unknown) {
	const code =
		typeof currency === 'string' && /^[A-Z]{3}$/i.test(currency)
			? currency.toUpperCase()
			: 'USD';
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: code,
		}).format(amountValue(value));
	} catch {
		return `${amountValue(value).toFixed(2)} ${code}`;
	}
}

function formatDateTime(value: unknown) {
	if (typeof value !== 'string' || !value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'UTC',
	}).format(date);
}

type ReceiptItem = {
	name: string;
	image: string | null;
	sku: string;
	size: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	storeName: string;
};

function receiptItems(payload: Payload): ReceiptItem[] {
	if (!Array.isArray(payload.items)) return [];
	return payload.items.flatMap((candidate) => {
		if (!candidate || Array.isArray(candidate) || typeof candidate !== 'object') {
			return [];
		}
		const item = candidate as Record<string, unknown>;
		const name = typeof item.name === 'string' ? item.name.trim() : '';
		if (!name) return [];
		return [
			{
				name,
				image: safeImageUrl(item.image),
				sku: typeof item.sku === 'string' ? item.sku : '',
				size: typeof item.size === 'string' ? item.size : '',
				quantity: Math.max(1, Math.floor(amountValue(item.quantity))),
				unitPrice: amountValue(item.unitPrice),
				totalPrice: amountValue(item.totalPrice),
				storeName:
					typeof item.storeName === 'string' ? item.storeName : '',
			},
		];
	});
}

function commerceItemsMarkup(
	payload: Payload,
	options: { heading: string; totalLabel: string; showTotals?: boolean },
) {
	const items = receiptItems(payload);
	const currency = payload.currency;
	const itemRows = items
		.map((item) => {
			const imageCell = item.image
				? `<td width="72" style="padding:12px 12px 12px 0;vertical-align:top"><img src="${escapeHtml(item.image)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0" /></td>`
				: '';
			const details = [
				item.storeName,
				item.sku ? `SKU: ${item.sku}` : '',
				item.size ? `Size: ${item.size}` : '',
			]
				.filter(Boolean)
				.map((value) => escapeHtml(value))
				.join(' &middot; ');
			return `<tr style="border-bottom:1px solid #e2e8f0">${imageCell}<td style="padding:12px 8px 12px 0;vertical-align:top"><div style="font-weight:700;color:#0f172a">${escapeHtml(item.name)}</div>${details ? `<div style="margin-top:4px;font-size:12px;line-height:1.5;color:#64748b">${details}</div>` : ''}<div style="margin-top:5px;font-size:13px;color:#475569">Qty ${item.quantity} &times; ${escapeHtml(formatMoney(item.unitPrice, currency))}</div></td><td width="105" style="padding:12px 0;text-align:right;vertical-align:top;font-weight:700;color:#0f172a">${escapeHtml(formatMoney(item.totalPrice, currency))}</td></tr>`;
		})
		.join('');
	const discountAmount = Math.max(0, amountValue(payload.discountAmount));
	const couponCode =
		typeof payload.couponCode === 'string' ? payload.couponCode.trim() : '';
	const summaryRows = [
		{ label: 'Subtotal', value: formatMoney(payload.subTotal, currency) },
		{ label: 'Shipping', value: formatMoney(payload.shippingFees, currency) },
		...(discountAmount > 0
			? [
					{
						label: couponCode ? `Coupon (${couponCode})` : 'Discount',
						value: `-${formatMoney(discountAmount, currency)}`,
					},
				]
			: []),
		{
			label: options.totalLabel,
			value: formatMoney(payload.total, currency),
			isTotal: true,
		},
	];
	const totalRows = summaryRows
		.map(
			({ label, value, isTotal }) =>
				`<tr><td style="padding:${isTotal ? '12px 0 4px' : '4px 0'};${isTotal ? 'border-top:1px solid #cbd5e1;font-size:17px;font-weight:700;' : ''}color:#475569">${escapeHtml(label)}</td><td style="padding:${isTotal ? '12px 0 4px' : '4px 0'};text-align:right;${isTotal ? 'border-top:1px solid #cbd5e1;font-size:17px;' : ''}font-weight:700;color:#0f172a">${escapeHtml(value)}</td></tr>`,
		)
		.join('');

	return {
		html: `<mj-section background-color="#ffffff" padding="0 30px 22px"><mj-column><mj-text padding="0 0 8px" color="#0f172a" font-size="18px" font-weight="700">${escapeHtml(options.heading)}</mj-text>${itemRows ? `<mj-text padding="0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemRows}</table></mj-text>` : ''}${options.showTotals === false ? '' : `<mj-text padding="14px 0 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${totalRows}</table></mj-text>`}</mj-column></mj-section>`,
		text: [
			...items.map(
				(item) =>
					`${item.name} — Qty ${item.quantity} — ${formatMoney(item.totalPrice, currency)}`,
			),
			...(options.showTotals === false
				? []
				: [
						`Subtotal: ${formatMoney(payload.subTotal, currency)}`,
						`Shipping: ${formatMoney(payload.shippingFees, currency)}`,
						...(discountAmount > 0
							? [
									`${couponCode ? `Coupon (${couponCode})` : 'Discount'}: -${formatMoney(discountAmount, currency)}`,
								]
							: []),
						`${options.totalLabel}: ${formatMoney(payload.total, currency)}`,
					]),
		].join('\n'),
	};
}

export async function renderEmailTemplate(input: {
	templateKey: string;
	payload?: Prisma.JsonValue | Payload;
	template?: EditableEmailTemplate;
	source?: EmailTemplateSource;
	version?: number;
}) {
	const definition = getEmailTemplateDefinition(input.templateKey);
	if (!definition) throw new Error(`Unsupported email template: ${input.templateKey}`);

	const template =
		input.template ??
		({
			subject: definition.subject,
			preheader: definition.preheader,
			bodyHtml: definition.bodyHtml,
			ctaLabel: definition.ctaLabel,
			enabled: true,
		} satisfies EditableEmailTemplate);
	validateTemplateVariables(
		template.subject,
		template.preheader,
		template.bodyHtml,
		template.ctaLabel,
	);

	const rawPayload = payloadRecord(
		input.payload ?? getEmailTemplateTestPayload(input.templateKey),
	);
	const payload: Payload = {
		...rawPayload,
		orderId: displayReference(rawPayload.orderId, 'order'),
		orderGroupId: displayReference(rawPayload.orderGroupId, 'package'),
	};
	const subject = cleanHeaderText(interpolate(template.subject, payload));
	const preheader = cleanHeaderText(interpolate(template.preheader, payload));
	const bodyHtml = sanitizeEmailBody(interpolate(template.bodyHtml, payload));
	const ctaLabel = cleanHeaderText(interpolate(template.ctaLabel, payload));
	const actionUrl = safeActionUrl(rawPayload);
	const referenceValues =
		input.templateKey === 'payment.succeeded'
			? [
					['Order', payload.orderId],
					['Payment method', payload.paymentMethod ?? payload.provider],
					[
						'Payment reference',
						payload.paymentReference ?? payload.providerPaymentId,
					],
					['Paid at', formatDateTime(payload.paidAt)],
				]
			: input.templateKey === 'checkout.abandoned'
				? [
						['Cart', payload.cartId],
						['Status', payload.nextStatus],
					]
				: input.templateKey === 'return.requested'
				? [
						['Return request', payload.returnRequestId],
						['Order', payload.orderId],
						['Package', payload.orderGroupId],
						['Store', payload.storeName],
						['Reason', payload.returnReason],
						['Requested resolution', payload.resolution],
						[
							'Estimated refund',
							typeof payload.requestedAmount === 'number' ||
							typeof payload.requestedAmount === 'string'
								? formatMoney(payload.requestedAmount, payload.currency)
								: '',
						],
					]
				: input.templateKey === 'shipment.status_changed'
					? [
							['Shipment', payload.shipmentId],
							['Order', payload.orderId],
							['Package', payload.orderGroupId],
							['Store', payload.storeName],
							['Shipping service', payload.shippingService],
							['Delivery estimate', payload.deliveryEstimate],
							['Status', payload.nextStatus],
							['Delivery note', payload.failureReason],
						]
					: [
							['Order', payload.orderId],
							['Package', payload.orderGroupId],
							['Store', payload.storeName],
							['Status', payload.nextStatus],
						];
	const referenceRows = referenceValues
		.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1]))
		.map(
			([label, value]) =>
				`<tr><td style="padding:6px 0;color:#64748b">${label}</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a">${escapeHtml(value)}</td></tr>`,
		)
		.join('');
	const itemSummaryOptions =
		input.templateKey === 'payment.succeeded'
			? { heading: 'Items in your order', totalLabel: 'Total paid' }
			: input.templateKey === 'package.paid_ready'
				? { heading: 'Products to prepare', totalLabel: 'Package total' }
				: input.templateKey === 'package.status_changed'
					? { heading: 'Products in this package', totalLabel: 'Package total' }
					: input.templateKey === 'shipment.status_changed'
						? { heading: 'Products in this shipment', totalLabel: 'Shipment value' }
						: input.templateKey === 'return.requested'
							? {
									heading: 'Requested return item',
									totalLabel: 'Estimated refund',
									showTotals: false,
								}
							: input.templateKey === 'checkout.abandoned'
								? {
										heading: 'Items saved in your cart',
										totalLabel: 'Cart total',
									}
								: null;
	const receipt =
		itemSummaryOptions && receiptItems(payload).length > 0
			? commerceItemsMarkup(payload, itemSummaryOptions)
			: null;
	const customerNote =
		input.templateKey === 'return.requested' &&
		typeof payload.customerNote === 'string' &&
		payload.customerNote.trim()
			? payload.customerNote.trim()
			: '';

	const result = await mjml2html(
		`<mjml>
			<mj-head>
				<mj-title>${escapeHtml(subject)}</mj-title>
				<mj-preview>${escapeHtml(preheader)}</mj-preview>
				<mj-attributes>
					<mj-all font-family="Arial, Helvetica, sans-serif" />
					<mj-text color="#334155" font-size="16px" line-height="1.65" />
				</mj-attributes>
			</mj-head>
			<mj-body background-color="#eef2f7" width="620px">
				<mj-section background-color="#0f172a" padding="22px 28px" border-radius="16px 16px 0 0">
					<mj-column><mj-text color="#ffffff" font-size="26px" font-weight="700" padding="0">GoCart</mj-text></mj-column>
				</mj-section>
				<mj-section background-color="#ffffff" padding="34px 30px 18px">
					<mj-column>
						<mj-text font-size="26px" line-height="1.3" font-weight="700" color="#0f172a" padding="0 0 16px">${escapeHtml(subject)}</mj-text>
						<mj-text padding="0">${bodyHtml}</mj-text>
					</mj-column>
				</mj-section>
				${referenceRows ? `<mj-section background-color="#ffffff" padding="0 30px 20px"><mj-column><mj-text padding="0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">${referenceRows}</table></mj-text></mj-column></mj-section>` : ''}
				${receipt?.html ?? ''}
				${customerNote ? `<mj-section background-color="#ffffff" padding="0 30px 22px"><mj-column><mj-text padding="0 0 6px" color="#0f172a" font-size="16px" font-weight="700">Customer note</mj-text><mj-text padding="0"><div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">${escapeHtml(customerNote)}</div></mj-text></mj-column></mj-section>` : ''}
				${actionUrl && ctaLabel ? `<mj-section background-color="#ffffff" padding="0 30px 34px"><mj-column><mj-button href="${escapeHtml(actionUrl)}" background-color="#2563eb" color="#ffffff" font-weight="700" border-radius="9px" padding="0" inner-padding="13px 22px">${escapeHtml(ctaLabel)}</mj-button></mj-column></mj-section>` : ''}
				<mj-section background-color="#f8fafc" padding="20px 30px" border-top="1px solid #e2e8f0" border-radius="0 0 16px 16px">
					<mj-column><mj-text color="#64748b" font-size="12px" padding="0">Transactional update from GoCart. For your security, open sensitive order details only after signing in.</mj-text></mj-column>
				</mj-section>
			</mj-body>
		</mjml>`,
		{ validationLevel: 'strict' },
	);
	if (result.errors.length > 0) {
		throw new Error(result.errors.map((error) => error.formattedMessage).join('; '));
	}

	return {
		subject: subject || definition.name,
		text: [
			subject,
			preheader,
			plainTextFromHtml(bodyHtml),
			receipt?.text,
			customerNote ? `Customer note: ${customerNote}` : '',
			actionUrl,
		]
			.filter(Boolean)
			.join('\n\n'),
		html: result.html,
		templateSource: input.source ?? EmailTemplateSource.DEFAULT,
		templateVersion: input.version ?? 0,
	};
}

export async function renderOutboxEmail(input: {
	templateKey: string;
	payload: Prisma.JsonValue;
}) {
	const override = await db.emailTemplate.findUnique({
		where: { templateKey: input.templateKey },
		select: {
			publishedSubject: true,
			publishedPreheader: true,
			publishedBodyHtml: true,
			publishedCtaLabel: true,
			publishedEnabled: true,
			publishedVersion: true,
		},
	});

	if (
		override?.publishedEnabled &&
		override.publishedSubject &&
		override.publishedPreheader &&
		override.publishedBodyHtml
	) {
		try {
			return renderEmailTemplate({
				templateKey: input.templateKey,
				payload: input.payload,
				template: {
					subject: override.publishedSubject,
					preheader: override.publishedPreheader,
					bodyHtml: override.publishedBodyHtml,
					ctaLabel: override.publishedCtaLabel || '',
					enabled: true,
				},
				source: EmailTemplateSource.CUSTOM,
				version: override.publishedVersion,
			});
		} catch {
			// A bad stored override must never block a transactional email.
		}
	}

	return renderEmailTemplate({
		templateKey: input.templateKey,
		payload: input.payload,
	});
}
