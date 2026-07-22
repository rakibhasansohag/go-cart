import { Suspense } from 'react';
import ShippingView from './shipping-view';
import ShippingSkeleton from '@/components/dashboard/shared/shipping-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoreShippingPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	return (
		<Suspense fallback={<ShippingSkeleton />}>
			<ShippingView storeUrl={storeUrl} />
		</Suspense>
	);
}
