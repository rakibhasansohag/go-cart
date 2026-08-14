import type { Metadata } from 'next';
import { getCommissionSettings } from '@/lib/settlement/service';
import PlatformSettingsForm from './platform-settings-form';

export const metadata: Metadata = {
	title: 'Marketplace settings | GoCart Admin',
	description: 'Manage GoCart marketplace commission and seller payout timing settings.',
	robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
	const settings = await getCommissionSettings();
	return <PlatformSettingsForm initialCommissionPercent={settings.commissionPercent} initialPayoutHoldDays={settings.payoutHoldDays} />;
}
