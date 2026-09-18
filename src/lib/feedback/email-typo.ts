// Popular disposable / temporary email domains that allow burner inboxes
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
	'10minutemail.com',
	'10minutemail.net',
	'tempmail.com',
	'temp-mail.org',
	'temp-mail.io',
	'mailinator.com',
	'guerrillamail.com',
	'guerrillamailblock.com',
	'sharklasers.com',
	'yopmail.com',
	'yopmail.fr',
	'dispostable.com',
	'throwawaymail.com',
	'getairmail.com',
	'maildrop.cc',
	'inboxkitten.com',
	'mytemp.email',
	'trashmail.com',
	'trashmail.net',
	'nada.ltd',
	'mohmal.com',
	'burnermail.io',
	'crazymailing.com',
	'generator.email',
	'tempmailo.com',
	'emailfake.com',
	'fakeinbox.com',
	'dropmail.me',
	'getnada.com',
	'fakemailgenerator.com',
	'minutemailbox.com',
]);

// Common domain typos mapped to their authentic target domain
export const COMMON_DOMAIN_TYPOS: Record<string, string> = {
	'gmial.com': 'gmail.com',
	'gmaill.com': 'gmail.com',
	'gamil.com': 'gmail.com',
	'gmai.com': 'gmail.com',
	'gmaik.com': 'gmail.com',
	'gmaio.com': 'gmail.com',
	'yaho.com': 'yahoo.com',
	'yahooo.com': 'yahoo.com',
	'yaho.co': 'yahoo.com',
	'hotmial.com': 'hotmail.com',
	'hotmai.com': 'hotmail.com',
	'hotmali.com': 'hotmail.com',
	'outlok.com': 'outlook.com',
	'outloo.com': 'outlook.com',
	'outllok.com': 'outlook.com',
	'iclod.com': 'icloud.com',
	'iclou.com': 'icloud.com',
	'prton.me': 'proton.me',
	'protonmai.com': 'protonmail.com',
};

/**
 * Checks for common typographical errors in popular email providers.
 */
export function checkEmailTypo(email: string): string | undefined {
	const trimmed = email.trim().toLowerCase();
	const atIndex = trimmed.lastIndexOf('@');
	if (atIndex === -1 || atIndex === trimmed.length - 1) return undefined;

	const localPart = trimmed.slice(0, atIndex);
	const domain = trimmed.slice(atIndex + 1);

	const correctedDomain = COMMON_DOMAIN_TYPOS[domain];
	if (correctedDomain) {
		return `${localPart}@${correctedDomain}`;
	}

	return undefined;
}

/**
 * Basic syntax validation adhering to standard format.
 */
export function validateEmailSyntax(email: string): boolean {
	const trimmed = email.trim().toLowerCase();
	const emailRegex =
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
	return emailRegex.test(trimmed) && trimmed.length <= 120;
}
