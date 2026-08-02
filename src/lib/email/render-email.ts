import 'server-only';

import { db } from '@/lib/db';
import { EmailTemplateSource, type Prisma } from '@prisma/client';
import mjml2html from 'mjml';
import sanitizeHtml from 'sanitize-html';
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

	const payload = payloadRecord(
		input.payload ?? getEmailTemplateTestPayload(input.templateKey),
	);
	const subject = cleanHeaderText(interpolate(template.subject, payload));
	const preheader = cleanHeaderText(interpolate(template.preheader, payload));
	const bodyHtml = sanitizeEmailBody(interpolate(template.bodyHtml, payload));
	const ctaLabel = cleanHeaderText(interpolate(template.ctaLabel, payload));
	const actionUrl = safeActionUrl(payload);
	const referenceRows = [
		['Order', payload.orderId],
		['Package', payload.orderGroupId],
		['Status', payload.nextStatus],
	]
		.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1]))
		.map(
			([label, value]) =>
				`<tr><td style="padding:6px 0;color:#64748b">${label}</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a">${escapeHtml(value)}</td></tr>`,
		)
		.join('');

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
				${actionUrl && ctaLabel ? `<mj-section background-color="#ffffff" padding="0 30px 34px"><mj-column><mj-button href="${escapeHtml(actionUrl)}" background-color="#2563eb" color="#ffffff" font-weight="700" border-radius="9px" padding="0" inner-padding="13px 22px">${escapeHtml(ctaLabel)}</mj-button></mj-column></mj-section>` : ''}
				<mj-section background-color="#f8fafc" padding="20px 30px" border-top="1px solid #e2e8f0" border-radius="0 0 16px 16px">
					<mj-column><mj-text color="#64748b" font-size="12px" padding="0">Transactional update from GoCart. For your security, open sensitive order details only after signing in.</mj-text></mj-column>
				</mj-section>
			</mj-body>
		</mjml>`,
		{ validationLevel: 'strict', minify: true },
	);
	if (result.errors.length > 0) {
		throw new Error(result.errors.map((error) => error.formattedMessage).join('; '));
	}

	return {
		subject: subject || definition.name,
		text: [subject, preheader, plainTextFromHtml(bodyHtml), actionUrl]
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
