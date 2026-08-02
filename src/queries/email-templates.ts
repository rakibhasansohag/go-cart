'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
	EMAIL_TEMPLATE_DEFINITIONS,
	getEmailTemplateDefinition,
	getEmailTemplateTestPayload,
} from '@/lib/email/templates';
import { renderEmailTemplate } from '@/lib/email/render-email';
import {
	sanitizeEmailBody,
	validateTemplateVariables,
} from '@/lib/email/template-safety';
import { sendSmtpEmail } from '@/lib/email/smtp';

const templateInputSchema = z.object({
	templateKey: z.string().min(1).max(120),
	subject: z.string().trim().min(1).max(200),
	preheader: z.string().trim().min(1).max(300),
	bodyHtml: z.string().trim().min(1).max(30_000),
	ctaLabel: z.string().trim().max(60),
	enabled: z.boolean(),
});

export type EmailTemplateInput = z.infer<typeof templateInputSchema>;

async function requireAdmin() {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, email: true, role: true },
	});
	if (!user || user.role !== Role.ADMIN) throw new Error('Unauthorized.');
	return user;
}

function normalizeTemplateInput(input: EmailTemplateInput) {
	const parsed = templateInputSchema.parse(input);
	if (!getEmailTemplateDefinition(parsed.templateKey)) {
		throw new Error('Unsupported email template.');
	}
	validateTemplateVariables(
		parsed.subject,
		parsed.preheader,
		parsed.bodyHtml,
		parsed.ctaLabel,
	);
	const bodyHtml = sanitizeEmailBody(parsed.bodyHtml);
	if (!bodyHtml.trim()) throw new Error('Email body cannot be empty.');
	return { ...parsed, bodyHtml };
}

export async function getEmailTemplates() {
	await requireAdmin();
	const overrides = await db.emailTemplate.findMany({
		orderBy: { templateKey: 'asc' },
	});
	const overridesByKey = new Map(
		overrides.map((override) => [override.templateKey, override]),
	);

	return EMAIL_TEMPLATE_DEFINITIONS.map((definition) => {
		const override = overridesByKey.get(definition.key);
		return {
			templateKey: definition.key,
			name: definition.name,
			category: definition.category,
			description: definition.description,
			audience: definition.audience,
			trigger: definition.trigger,
			allowedVariables: [...definition.allowedVariables],
			draft: {
				subject: override?.draftSubject ?? definition.subject,
				preheader: override?.draftPreheader ?? definition.preheader,
				bodyHtml: override?.draftBodyHtml ?? definition.bodyHtml,
				ctaLabel: override?.draftCtaLabel ?? definition.ctaLabel,
				enabled: override?.draftEnabled ?? true,
			},
			publishedVersion: override?.publishedVersion ?? 0,
			publishedAt: override?.publishedAt?.toISOString() ?? null,
			hasPublishedOverride: Boolean(
				override?.publishedVersion && override.publishedEnabled,
			),
			hasDraftOverride: Boolean(override),
			updatedAt: override?.updatedAt.toISOString() ?? null,
		};
	});
}

export async function saveEmailTemplateDraft(input: EmailTemplateInput) {
	const admin = await requireAdmin();
	const template = normalizeTemplateInput(input);
	await db.emailTemplate.upsert({
		where: { templateKey: template.templateKey },
		update: {
			draftSubject: template.subject,
			draftPreheader: template.preheader,
			draftBodyHtml: template.bodyHtml,
			draftCtaLabel: template.ctaLabel || null,
			draftEnabled: template.enabled,
			updatedById: admin.id,
		},
		create: {
			templateKey: template.templateKey,
			draftSubject: template.subject,
			draftPreheader: template.preheader,
			draftBodyHtml: template.bodyHtml,
			draftCtaLabel: template.ctaLabel || null,
			draftEnabled: template.enabled,
			updatedById: admin.id,
		},
	});
	return { ok: true };
}

export async function publishEmailTemplate(templateKey: string) {
	const admin = await requireAdmin();
	const draft = await db.emailTemplate.findUnique({ where: { templateKey } });
	if (!draft) throw new Error('Save a custom draft before publishing.');
	const template = normalizeTemplateInput({
		templateKey: draft.templateKey,
		subject: draft.draftSubject,
		preheader: draft.draftPreheader,
		bodyHtml: draft.draftBodyHtml,
		ctaLabel: draft.draftCtaLabel || '',
		enabled: draft.draftEnabled,
	});
	// Compile before publishing. Invalid MJML or variables cannot become active.
	await renderEmailTemplate({
		templateKey,
		payload: getEmailTemplateTestPayload(templateKey),
		template,
	});

	const published = await db.emailTemplate.update({
		where: { templateKey },
		data: {
			publishedSubject: template.subject,
			publishedPreheader: template.preheader,
			publishedBodyHtml: template.bodyHtml,
			publishedCtaLabel: template.ctaLabel || null,
			publishedEnabled: template.enabled,
			publishedVersion: { increment: 1 },
			publishedAt: new Date(),
			updatedById: admin.id,
		},
		select: { publishedVersion: true, publishedAt: true },
	});
	return {
		ok: true,
		version: published.publishedVersion,
		publishedAt: published.publishedAt?.toISOString() ?? null,
	};
}

export async function resetEmailTemplate(templateKey: string) {
	await requireAdmin();
	if (!getEmailTemplateDefinition(templateKey)) {
		throw new Error('Unsupported email template.');
	}
	await db.emailTemplate.deleteMany({ where: { templateKey } });
	return { ok: true };
}

export async function previewEmailTemplate(input: EmailTemplateInput) {
	await requireAdmin();
	const template = normalizeTemplateInput(input);
	const rendered = await renderEmailTemplate({
		templateKey: template.templateKey,
		payload: getEmailTemplateTestPayload(template.templateKey),
		template,
	});
	return { subject: rendered.subject, html: rendered.html, text: rendered.text };
}

export async function sendTestEmailTemplate(input: {
	template: EmailTemplateInput;
	recipientEmail?: string;
}) {
	const admin = await requireAdmin();
	const emailSchema = z.string().trim().email();
	const explicitRecipient = input.recipientEmail?.trim();
	if (explicitRecipient) {
		const parsed = emailSchema.safeParse(explicitRecipient);
		if (!parsed.success) {
			throw new Error('Enter a valid recipient email address.');
		}
	}
	let recipientEmail = explicitRecipient;
	if (!recipientEmail) {
		const databaseEmail = emailSchema.safeParse(admin.email);
		if (databaseEmail.success) recipientEmail = databaseEmail.data;
	}
	if (!recipientEmail) {
		const clerkUser = await currentUser();
		const clerkEmail = emailSchema.safeParse(
			clerkUser?.primaryEmailAddress?.emailAddress,
		);
		if (clerkEmail.success) recipientEmail = clerkEmail.data;
	}
	if (!recipientEmail) {
		throw new Error(
			'Your admin account has no valid email address. Enter a test recipient.',
		);
	}
	const template = normalizeTemplateInput(input.template);
	const rendered = await renderEmailTemplate({
		templateKey: template.templateKey,
		payload: getEmailTemplateTestPayload(template.templateKey),
		template,
	});
	await sendSmtpEmail({
		to: recipientEmail,
		subject: `[TEST] ${rendered.subject}`,
		html: rendered.html,
		text: rendered.text,
	});
	return { ok: true, recipientEmail };
}
