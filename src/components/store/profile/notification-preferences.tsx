'use client';

import { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { updateNotificationEmailPreference } from '@/queries/notifications';

type NotificationCategory = 'ORDER' | 'PAYMENT' | 'FULFILLMENT' | 'DELIVERY' | 'CANCELLATION' | 'RETURN' | 'REFUND' | 'SYSTEM';

const categories: Array<{ value: NotificationCategory; label: string; description: string }> = [
	{ value: 'ORDER', label: 'Order updates', description: 'Paid orders, cancellations, and checkout reminders.' },
	{ value: 'FULFILLMENT', label: 'Package preparation', description: 'Acceptance, processing, and handoff progress.' },
	{ value: 'DELIVERY', label: 'Delivery updates', description: 'Shipment and delivery progress.' },
	{ value: 'RETURN', label: 'Returns', description: 'Return requests and decisions.' },
	{ value: 'CANCELLATION', label: 'Cancellations', description: 'Cancellation requests and decisions.' },
	{ value: 'SYSTEM', label: 'Account notices', description: 'Important account and platform messages.' },
];

export default function NotificationPreferences({ initialPreferences }: { initialPreferences: Array<{ category: NotificationCategory; channel: string; enabled: boolean }> }) {
	const enabledByCategory = new Map(
		initialPreferences.filter((preference) => preference.channel === 'EMAIL').map((preference) => [preference.category, preference.enabled]),
	);
	const [emailEnabled, setEmailEnabled] = useState<Record<string, boolean>>(
		Object.fromEntries(categories.map((category) => [category.value, enabledByCategory.get(category.value) ?? true])),
	);
	const [saving, setSaving] = useState<string | null>(null);

	const update = async (category: NotificationCategory, enabled: boolean) => {
		setEmailEnabled((current) => ({ ...current, [category]: enabled }));
		setSaving(category);
		try {
			await updateNotificationEmailPreference({ category, channel: 'EMAIL', enabled });
			toast.success('Notification preference updated.');
		} catch (error) {
			setEmailEnabled((current) => ({ ...current, [category]: !enabled }));
			toast.error(error instanceof Error ? error.message : 'Could not update preference.');
		} finally {
			setSaving(null);
		}
	};

	return (
		<section className='space-y-5' aria-labelledby='notification-preferences-title'>
			<div>
				<h1 id='notification-preferences-title' className='text-2xl font-semibold'>Notification preferences</h1>
				<p className='mt-1 text-sm text-muted-foreground'>Choose which optional updates arrive by email. In-app notifications remain available for your activity history.</p>
			</div>
			<div className='overflow-hidden rounded-xl border border-border/60 bg-background'>
				<div className='grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border/60 bg-muted/30 px-5 py-4 text-sm font-medium'>
					<span className='flex items-center gap-2'><Bell className='size-4' /> Notification type</span>
					<span className='flex items-center gap-2'><Mail className='size-4' /> Email</span>
				</div>
				{categories.map((category) => (
					<div key={category.value} className='grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border/50 px-5 py-4 last:border-b-0'>
						<div>
							<p className='font-medium'>{category.label}</p>
							<p className='text-sm text-muted-foreground'>{category.description}</p>
						</div>
						<Switch checked={emailEnabled[category.value]} disabled={saving === category.value} onCheckedChange={(checked) => update(category.value, checked)} aria-label={`Email ${category.label}`} />
					</div>
				))}
				<div className='grid grid-cols-[1fr_auto] items-center gap-4 bg-muted/20 px-5 py-4'>
					<div><p className='font-medium'>Payment and refund receipts</p><p className='text-sm text-muted-foreground'>Required transactional emails stay enabled for account and payment safety.</p></div>
					<Switch checked disabled aria-label='Payment and refund receipts are required' />
				</div>
			</div>
		</section>
	);
}
