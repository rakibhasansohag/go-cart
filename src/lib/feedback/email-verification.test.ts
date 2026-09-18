import { describe, it, expect } from 'vitest';
import {
	checkEmailTypo,
	validateEmailSyntax,
	verifyEmailAuthenticity,
	isBotSubmission,
} from './email-verification';

describe('Email Authenticity Verification', () => {
	it('detects common domain typos', () => {
		expect(checkEmailTypo('user@gmial.com')).toBe('user@gmail.com');
		expect(checkEmailTypo('alex@yaho.com')).toBe('alex@yahoo.com');
		expect(checkEmailTypo('contact@outlok.com')).toBe('contact@outlook.com');
		expect(checkEmailTypo('hello@gmail.com')).toBeUndefined();
	});

	it('validates standard email syntax', () => {
		expect(validateEmailSyntax('developer@gocart.test')).toBe(true);
		expect(validateEmailSyntax('user.name+tag@example.com')).toBe(true);
		expect(validateEmailSyntax('invalid-no-at-sign')).toBe(false);
		expect(validateEmailSyntax('missingdomain@')).toBe(false);
		expect(validateEmailSyntax('@missingusername.com')).toBe(false);
	});

	it('rejects disposable email domains', async () => {
		const result = await verifyEmailAuthenticity('burner@mailinator.com');
		expect(result.isValid).toBe(false);
		expect(result.isAuthentic).toBe(false);
		expect(result.reason).toContain('Disposable or temporary email');
	});

	it('rejects domains that do not exist', async () => {
		const result = await verifyEmailAuthenticity(
			'user@nonexistentdomainfake12345abcdefg.org',
		);
		expect(result.isValid).toBe(false);
		expect(result.isAuthentic).toBe(false);
		expect(result.reason).toContain('does not exist or has no active mail server');
	});

	it('accepts legitimate domains with active MX records', async () => {
		const result = await verifyEmailAuthenticity('test@gmail.com');
		expect(result.isValid).toBe(true);
		expect(result.isAuthentic).toBe(true);
	});

	it('detects honeypot bot submissions', () => {
		expect(isBotSubmission('spam_bot_input')).toBe(true);
		expect(isBotSubmission('')).toBe(false);
		expect(isBotSubmission(undefined)).toBe(false);
	});
});
