import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity } from 'lucide-react';
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
			<header className='flex flex-wrap items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>Email templates</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Edit safe transactional content while GoCart keeps the responsive
						layout, security fields, and fallback templates under application control.
					</p>
				</div>
				<Link
					href='/dashboard/admin/delivery-health'
					className='inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors'
				>
					<Activity className='size-4 text-primary' />
					Delivery Health &amp; Outbox Queue
				</Link>
			</header>
			<EmailTemplateManager initialTemplates={templates} />
		</div>
	);
}


