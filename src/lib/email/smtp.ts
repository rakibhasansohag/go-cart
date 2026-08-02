import 'server-only';

import nodemailer, { type Transporter } from 'nodemailer';
import { getEmailDeliveryConfig } from './config';

const globalForEmail = globalThis as typeof globalThis & {
	goCartSmtpTransporter?: Transporter;
};

function createSmtpTransporter() {
	const config = getEmailDeliveryConfig();
	const connection =
		config.provider === 'gmail'
			? { service: 'gmail' }
			: {
					host: config.host,
					port: config.port,
					secure: config.secure,
					requireTLS: config.requireTls,
				};

	return nodemailer.createTransport({
		...connection,
		auth: { user: config.user, pass: config.pass },
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 30_000,
		disableFileAccess: true,
		disableUrlAccess: true,
	});
}

export function getSmtpTransporter() {
	globalForEmail.goCartSmtpTransporter ??= createSmtpTransporter();
	return globalForEmail.goCartSmtpTransporter;
}

export async function verifySmtpConnection() {
	return getSmtpTransporter().verify();
}

export async function sendSmtpEmail(input: {
	to: string;
	subject: string;
	html: string;
	text: string;
}) {
	const config = getEmailDeliveryConfig();
	return getSmtpTransporter().sendMail({
		from: config.from,
		to: input.to,
		subject: input.subject,
		html: input.html,
		text: input.text,
	});
}
