import type { Metadata } from 'next';
import EmailTemplateManager from '@/components/dashboard/email-templates/email-template-manager';
import { getEmailTemplates } from '@/queries/email-templates';

export const metadata: Metadata = {
	title: 'Email templates | GoCart Admin',
	description: 'Manage GoCart transactional email templates.',
	robots: { index: false, follow: false },
};

export default async function AdminEmailTemplatesPage() {
	const templates = await getEmailTemplates();

	return (
		<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 xl:h-[calc(100dvh-129px)] xl:min-h-0 xl:overflow-hidden'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Email templates</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Edit safe transactional content while GoCart keeps the responsive
					layout, security fields, and fallback templates under application control.
				</p>
			</header>
			<EmailTemplateManager initialTemplates={templates} />
		</div>
	);
}
