// Queries
import DataTable from '@/components/ui/data-table';
import { columns } from './columns';

import { getStoreOrders } from '@/queries/store';

export default async function SellerOrdersPage({
	params,
}: {
	params: { storeUrl: string };
}) {
	// Get all store coupons
	const orders = await getStoreOrders(params.storeUrl);
	return (
		<div>
			<DataTable
				filterValue='id'
				data={orders}
				columns={columns}
				searchPlaceholder='Search order by id ...'
			/>
		</div>
	);
}
