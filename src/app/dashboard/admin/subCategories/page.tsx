import { Suspense } from 'react';
import SubCategoriesTable from './subcategories-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default function AdminSubCategoriesPage() {
	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<SubCategoriesTable />
		</Suspense>
	);
}
