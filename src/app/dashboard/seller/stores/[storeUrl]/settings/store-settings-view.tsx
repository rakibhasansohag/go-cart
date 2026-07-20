'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import StoreDetails from '@/components/dashboard/forms/store-details';
import { queryKeys } from '@/lib/query-keys';

interface StoreSettingsViewProps {
	storeUrl: string;
	initialStoreDetails: any;
}

export default function StoreSettingsView({
	storeUrl,
	initialStoreDetails,
}: StoreSettingsViewProps) {
	const { data: storeDetails } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.storeSettings(storeUrl),
		queryFn: async () => initialStoreDetails,
	});

	if (!storeDetails) return null;

	return (
		<div>
			<StoreDetails data={storeDetails} />
		</div>
	);
}
