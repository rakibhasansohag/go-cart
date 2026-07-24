'use client';

import { useQuery } from '@tanstack/react-query';
import StoreDefaultShippingDetails from '@/components/dashboard/forms/store-default-shipping-details';
import DataTable from '@/components/ui/data-table';
import {
	getStoreDefaultShippingDetails,
	getStoreShippingRates,
} from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import {
	CountryWithShippingRatesType,
	StoreDefaultShippingType,
} from '@/lib/types';

interface ShippingViewProps {
	storeUrl: string;
	initialDetails: StoreDefaultShippingType;
	initialRates: CountryWithShippingRatesType[];
}

export default function ShippingView({
	storeUrl,
	initialDetails,
	initialRates,
}: ShippingViewProps) {
	const { data: shippingDetails } = useQuery({
		queryKey: queryKeys.dashboard.shipping(storeUrl),
		queryFn: async () => {
			const [details, rates] = await Promise.all([
				getStoreDefaultShippingDetails(storeUrl),
				getStoreShippingRates(storeUrl),
			]);
			return { details, rates };
		},
		initialData: { details: initialDetails, rates: initialRates },
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
