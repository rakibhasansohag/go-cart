import { Suspense } from 'react';
import CategoriesTable from './categories-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllCategories } from '@/queries/category';

export default async function AdminCategoriesPage() {
	const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;
	if (!CLOUDINARY_CLOUD_NAME) throw new Error('Missing Cloudinary Cloud Name');

	const categories = await getAllCategories();

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<CategoriesTable
				cloudinary_key={CLOUDINARY_CLOUD_NAME}
				initialCategories={categories}
			/>
		</Suspense>
	);
}
