import type { Metadata } from 'next';
import EmailTemplateManager from '@/components/dashboard/email-templates/email-template-manager';
import AdminDeliveryHealth from '@/components/dashboard/notifications/admin-delivery-health';
import { getEmailTemplates } from '@/queries/email-templates';
import { getAdminDeliveryHealth } from '@/queries/notifications';

export const metadata: Metadata = {
	title: 'Email templates & Delivery Health | GoCart Admin',
	description: 'Manage GoCart transactional email templates and outbox health.',
	robots: { index: false, follow: false },
};

export default async function AdminEmailTemplatesPage() {
	const [templates, deliveryHealth] = await Promise.all([
		getEmailTemplates(),
		getAdminDeliveryHealth(),
	]);

	return (
		<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-8 pb-12'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Email templates &amp; Delivery Health</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Edit safe transactional content, monitor email outbox delivery health, and manage retry operations.
				</p>
			</header>
			<EmailTemplateManager initialTemplates={templates} />
			<AdminDeliveryHealth initialData={deliveryHealth} />
		</div>
	);
}

