import 'server-only';

import sanitizeHtml from 'sanitize-html';
import { EMAIL_TEMPLATE_VARIABLES } from './templates';

const variablePattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const allowedVariables = new Set<string>(EMAIL_TEMPLATE_VARIABLES);

export function validateTemplateVariables(...values: string[]) {
	const unknown = new Set<string>();
	for (const value of values) {
		for (const match of value.matchAll(variablePattern)) {
			if (!allowedVariables.has(match[1])) unknown.add(match[1]);
		}
	}
	if (unknown.size > 0) {
		throw new Error(`Unknown email variable(s): ${[...unknown].join(', ')}`);
	}
}

export function sanitizeEmailBody(bodyHtml: string) {
	return sanitizeHtml(bodyHtml, {
		allowedTags: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			's',
			'ul',
			'ol',
			'li',
			'blockquote',
			'h2',
			'h3',
			'a',
		],
		allowedAttributes: {
			a: ['href', 'title'],
		},
		allowedSchemes: ['https', 'mailto'],
		allowProtocolRelative: false,
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				target: '_blank',
				rel: 'noopener noreferrer',
			}),
		},
	});
}

export function plainTextFromHtml(bodyHtml: string) {
	return sanitizeHtml(bodyHtml, {
		allowedTags: [],
		allowedAttributes: {},
	})
		.replace(/\s+/g, ' ')
		.trim();
}
