import { Suspense } from 'react';
import AdminOverview from './admin-overview';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';

export default function AdminDashboardPage() {
	return (
		<Suspense fallback={<OverviewSkeleton />}>
			<AdminOverview />
		</Suspense>
	);
}
