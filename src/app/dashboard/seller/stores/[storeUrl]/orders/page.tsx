// Queries
import DataTable from '@/components/ui/data-table';
import { columns } from './columns';

import { getStoreOrders } from '@/queries/store';
import { notFound } from 'next/navigation';

type Params = {
	storeUrl: string;
};

export default async function SellerOrdersPage({
	params,
}: {
	params: Params | Promise<Params>;
}) {
	const { storeUrl } = await params;

	// optional guard
	if (!storeUrl) {
		return notFound();
	}

	// Get all store coupons
	const orders = await getStoreOrders(storeUrl);
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
