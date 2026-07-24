'use client';

import { useQuery } from '@tanstack/react-query';
import StoreDetails from '@/components/dashboard/forms/store-details';
import { getStoreByUrl } from '@/queries/store';
import { queryKeys } from '@/lib/query-keys';
import { Store } from '@prisma/client';

interface StoreSettingsViewProps {
	storeUrl: string;
	initialStore: Store | null;
}

export default function StoreSettingsView({
	storeUrl,
	initialStore,
}: StoreSettingsViewProps) {
	const { data: storeDetails } = useQuery({
		queryKey: queryKeys.dashboard.storeSettings(storeUrl),
		queryFn: () => getStoreByUrl(storeUrl),
		initialData: initialStore,
	});

	if (!storeDetails) return null;

	return (
		<div>
			<StoreDetails data={storeDetails} />
		</div>
	);
}
