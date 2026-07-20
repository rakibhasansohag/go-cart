'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllStoreProducts } from '@/queries/product';
import ProductDetails from '@/components/dashboard/forms/product-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { Country, OfferTag } from '@prisma/client';
import { CategoryWithSubs } from '@/queries/category';

interface ProductsTableProps {
	storeUrl: string;
	categories: CategoryWithSubs[];
	offerTags: OfferTag[];
	countries: Country[];
}

export default function ProductsTable({
	storeUrl,
	categories,
	offerTags,
	countries,
}: ProductsTableProps) {
	const { data: products } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.products(storeUrl),
		queryFn: () => getAllStoreProducts(storeUrl),
	});

	if (!products) return null;

	return (
		<DataTable
			actionButtonText={
				<>
					<Plus size={15} />
					Create product
				</>
			}
			modalChildren={
				<ProductDetails
					categories={categories}
					offerTags={offerTags}
					storeUrl={storeUrl}
					countries={countries}
				/>
			}
			newTabLink={`/dashboard/seller/stores/${storeUrl}/products/new`}
			filterValue='name'
			data={products}
			columns={columns}
			searchPlaceholder='Search product name...'
			maxWidth='lg:max-w-6xl'
		/>
	);
}
