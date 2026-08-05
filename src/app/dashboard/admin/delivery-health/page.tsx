import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import AdminDeliveryHealth from '@/components/dashboard/notifications/admin-delivery-health';
import { getAdminDeliveryHealth } from '@/queries/notifications';

export const metadata: Metadata = {
	title: 'Delivery Health & Email Outbox | GoCart Admin',
	description: 'Monitor email outbox delivery health, failed email jobs, and automation cron status.',
	robots: { index: false, follow: false },
};

export default async function AdminDeliveryHealthPage() {
	const deliveryHealth = await getAdminDeliveryHealth();

	return (
		<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-12'>
			<header className='flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4'>
				<div>
					<div className='flex items-center gap-2 mb-1'>
						<Link
							href='/dashboard/admin/email-templates'
							className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors'
						>
							<ArrowLeft className='size-3.5' />
							Back to Email Templates
						</Link>
					</div>
					<h1 className='text-2xl font-bold tracking-tight'>Delivery Health &amp; Email Outbox</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Monitor email dispatch status, retry failed notification jobs, and audit background automation runs.
					</p>
				</div>
				<Link
					href='/dashboard/admin/email-templates'
					className='inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors'
				>
					<Mail className='size-4 text-primary' />
					Edit Templates
				</Link>
			</header>

			<AdminDeliveryHealth initialData={deliveryHealth} />
		</div>
	);
}
