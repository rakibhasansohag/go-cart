'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import StoreDetails from '@/components/dashboard/forms/store-details';
import { getStoreByUrl } from '@/queries/store';
import { queryKeys } from '@/lib/query-keys';

interface StoreSettingsViewProps {
	storeUrl: string;
}

export default function StoreSettingsView({ storeUrl }: StoreSettingsViewProps) {
	const { data: storeDetails } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.storeSettings(storeUrl),
		queryFn: () => getStoreByUrl(storeUrl),
	});

	if (!storeDetails) return null;

	return (
		<div>
			<StoreDetails data={storeDetails} />
		</div>
	);
}
