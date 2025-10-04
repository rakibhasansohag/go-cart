import StoreDefaultShippingDetails from '@/components/dashboard/forms/store-default-shipping-details';
import DataTable from '@/components/ui/data-table';
import {
	getStoreDefaultShippingDetails,
	getStoreShippingRates,
} from '@/queries/store';
import { redirect } from 'next/navigation';
import { columns } from './columns';

// typed alias for clarity
type StoreParams = { storeUrl: string };

export default async function SellerStoreShippingPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	// await the whole proxy first (Next 15 requirement)
	const { storeUrl } = await params;

	const shippingDetails = await getStoreDefaultShippingDetails(storeUrl);
	const shippingRates = await getStoreShippingRates(storeUrl);
	if (!shippingDetails || !shippingRates) return redirect('/');
	return (
		<div>
			<StoreDefaultShippingDetails data={shippingDetails} storeUrl={storeUrl} />
			<DataTable
				filterValue='countryName'
				data={shippingRates}
				columns={columns}
				searchPlaceholder='Search by country name...'
			/>
		</div>
	);
}
