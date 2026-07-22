import { Suspense } from 'react';
import StoreSettingsView from './store-settings-view';
import FormSkeleton from '@/components/dashboard/shared/form-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoreSettingsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	return (
		<Suspense fallback={<FormSkeleton />}>
			<StoreSettingsView storeUrl={storeUrl} />
		</Suspense>
	);
}
