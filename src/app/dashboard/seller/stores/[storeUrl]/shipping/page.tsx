import { Suspense } from 'react';
import ShippingView from './shipping-view';
import ShippingSkeleton from '@/components/dashboard/shared/shipping-skeleton';
import {
	getStoreDefaultShippingDetails,
	getStoreShippingRates,
} from '@/queries/store';

type StoreParams = { storeUrl: string };

export default async function SellerStoreShippingPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const [details, rates] = await Promise.all([
		getStoreDefaultShippingDetails(storeUrl),
		getStoreShippingRates(storeUrl),
	]);

	return (
		<Suspense fallback={<ShippingSkeleton />}>
			<ShippingView
				storeUrl={storeUrl}
				initialDetails={details}
				initialRates={rates}
			/>
		</Suspense>
	);
}
