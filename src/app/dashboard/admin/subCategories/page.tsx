import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getAllSubCategories } from '@/queries/subCategory';
import { getAllCategories } from '@/queries/category';
import { queryKeys } from '@/lib/query-keys';
import SubCategoriesTable from './subcategories-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default async function AdminSubCategoriesPage() {
	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.subCategories(),
		queryFn: () => getAllSubCategories(),
	});

	const categories = await getAllCategories();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<SubCategoriesTable categories={categories} />
			</Suspense>
		</HydrationBoundary>
	);
}
