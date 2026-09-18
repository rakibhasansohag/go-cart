import { EmailValidationResult } from './types';
import * as dns from 'node:dns';
import {
	DISPOSABLE_EMAIL_DOMAINS,
	COMMON_DOMAIN_TYPOS,
	checkEmailTypo,
	validateEmailSyntax,
} from './email-typo';

export {
	DISPOSABLE_EMAIL_DOMAINS,
	COMMON_DOMAIN_TYPOS,
	checkEmailTypo,
	validateEmailSyntax,
};

/**
 * Server-side authentic email verification without OTP friction:
 * 1. Syntax check
 * 2. Disposable / temporary domain block
 * 3. DNS MX record validation (checks that the domain has live mail exchange servers)
 */
export async function verifyEmailAuthenticity(
	email: string,
): Promise<EmailValidationResult> {
	const trimmed = email.trim().toLowerCase();

	if (!validateEmailSyntax(trimmed)) {
		return {
			isValid: false,
			isAuthentic: false,
			reason: 'Invalid email syntax format.',
		};
	}

	const atIndex = trimmed.lastIndexOf('@');
	const domain = trimmed.slice(atIndex + 1);

	// Check typo
	const suggestion = checkEmailTypo(trimmed);

	// Check disposable blocklist
	if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
		return {
			isValid: false,
			isAuthentic: false,
			reason:
				'Disposable or temporary email addresses are not accepted. Please use a permanent email address.',
		};
	}

	// Verify DNS MX records on the domain
	try {
		const resolver = new dns.promises.Resolver();
		resolver.setServers(['8.8.8.8', '1.1.1.1']);

		const mxRecords = await resolver.resolveMx(domain);

		if (!mxRecords || mxRecords.length === 0) {
			return {
				isValid: false,
				isAuthentic: false,
				suggestion,
				reason: `The domain "${domain}" does not appear to have an active mail exchange server to receive emails.`,
			};
		}

		return {
			isValid: true,
			isAuthentic: true,
			suggestion,
		};
	} catch (error: unknown) {
		const errCode = (error as { code?: string })?.code;

		if (
			errCode === 'ENOTFOUND' ||
			errCode === 'ENODATA' ||
			errCode === 'SERVFAIL'
		) {
			return {
				isValid: false,
				isAuthentic: false,
				suggestion,
				reason: `The domain "${domain}" does not exist or has no active mail server.`,
			};
		}

		return {
			isValid: true,
			isAuthentic: true,
			suggestion,
		};
	}
}

/**
 * Validates honeypot field to drop automated spambot submissions silently.
 */
export function isBotSubmission(honeypotValue?: string): boolean {
	return Boolean(honeypotValue && honeypotValue.trim().length > 0);
}
