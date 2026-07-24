'use client';

import { useQuery } from '@tanstack/react-query';
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
	initialProducts: any[];
	categories: any[];
	offerTags: any[];
	countries: any[];
}

export default function ProductsTable({
	storeUrl,
	initialProducts,
	categories: initialCategories,
	offerTags: initialOfferTags,
	countries: initialCountries,
}: ProductsTableProps) {
	const { data: productsData } = useQuery({
		queryKey: queryKeys.dashboard.products(storeUrl),
		queryFn: () => getAllStoreProducts(storeUrl),
		initialData: { products: initialProducts, nextCursor: null, hasNextPage: false },
	});

	const { data: categories = initialCategories } = useQuery({
		queryKey: ['categoriesWithSubs'],
		queryFn: () => getAllCategoriesWithSubs(),
		initialData: initialCategories,
		staleTime: 10 * 60 * 1000,
	});

	const { data: offerTags = initialOfferTags } = useQuery({
		queryKey: queryKeys.dashboard.offerTags(),
		queryFn: () => getAllOfferTags(),
		initialData: initialOfferTags,
		staleTime: 10 * 60 * 1000,
	});

	const { data: countries = initialCountries } = useQuery({
		queryKey: ['countries'],
		queryFn: () => getAllCountries(),
		initialData: initialCountries,
		staleTime: 10 * 60 * 1000,
	});

	const products = productsData?.products || initialProducts || [];

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
