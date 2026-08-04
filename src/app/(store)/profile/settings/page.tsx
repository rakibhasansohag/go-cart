import NotificationPreferences from '@/components/store/profile/notification-preferences';
import { getNotificationPreferences } from '@/queries/notifications';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
	const preferences = await getNotificationPreferences();
	return <NotificationPreferences initialPreferences={preferences} />;
}
