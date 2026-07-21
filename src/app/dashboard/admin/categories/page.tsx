import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getAllCategories } from '@/queries/category';
import { queryKeys } from '@/lib/query-keys';
import CategoriesTable from './categories-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

const AdminCategoriesPage = async () => {
	const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;
	if (!CLOUDINARY_CLOUD_NAME) throw new Error('Missing Cloudinary Cloud Name');

	const queryClient = getQueryClient();
	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.categories(),
		queryFn: () => getAllCategories(),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<CategoriesTable cloudinary_key={CLOUDINARY_CLOUD_NAME} />
			</Suspense>
		</HydrationBoundary>
	);
};

export default AdminCategoriesPage;
