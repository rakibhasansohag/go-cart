'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import StoreDefaultShippingDetails from '@/components/dashboard/forms/store-default-shipping-details';
import DataTable from '@/components/ui/data-table';
import {
	getStoreDefaultShippingDetails,
	getStoreShippingRates,
} from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface ShippingViewProps {
	storeUrl: string;
}

export default function ShippingView({ storeUrl }: ShippingViewProps) {
	const { data: shippingDetails } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.shipping(storeUrl),
		queryFn: async () => {
			const [details, rates] = await Promise.all([
				getStoreDefaultShippingDetails(storeUrl),
				getStoreShippingRates(storeUrl),
			]);
			return { details, rates };
		},
	});

	if (!shippingDetails?.details || !shippingDetails?.rates) return null;

	return (
		<div>
			<StoreDefaultShippingDetails
				data={shippingDetails.details}
				storeUrl={storeUrl}
			/>
			<DataTable
				filterValue='countryName'
				data={shippingDetails.rates}
				columns={columns}
				searchPlaceholder='Search by country name...'
			/>
		</div>
	);
}
