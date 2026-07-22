'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllStoreProducts } from '@/queries/product';
import { getAllCategoriesWithSubs } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { getAllCountries } from '@/queries/country';
import ProductDetails from '@/components/dashboard/forms/product-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface ProductsTableProps {
	storeUrl: string;
}

export default function ProductsTable({ storeUrl }: ProductsTableProps) {
	const { data: products } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.products(storeUrl),
		queryFn: () => getAllStoreProducts(storeUrl),
	});

	const { data: categories = [] } = useQuery({
		queryKey: ['categoriesWithSubs'],
		queryFn: () => getAllCategoriesWithSubs(),
		staleTime: 10 * 60 * 1000,
	});

	const { data: offerTags = [] } = useQuery({
		queryKey: queryKeys.dashboard.offerTags(),
		queryFn: () => getAllOfferTags(),
		staleTime: 10 * 60 * 1000,
	});

	const { data: countries = [] } = useQuery({
		queryKey: ['countries'],
		queryFn: () => getAllCountries(),
		staleTime: 10 * 60 * 1000,
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
