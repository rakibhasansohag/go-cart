import { Suspense } from 'react';
import SubCategoriesTable from './subcategories-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllSubCategories } from '@/queries/subCategory';
import { getAllCategories } from '@/queries/category';

export default async function AdminSubCategoriesPage() {
	const [subCategories, categories] = await Promise.all([
		getAllSubCategories(),
		getAllCategories(),
	]);

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<SubCategoriesTable
				initialSubCategories={subCategories}
				initialCategories={categories}
			/>
		</Suspense>
	);
}
