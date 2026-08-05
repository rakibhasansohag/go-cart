'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllCategories } from '@/queries/category';
import CategoryDetails from '@/components/dashboard/forms/category-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface CategoriesTableProps {
	cloudinary_key: string;
	initialCategories?: Awaited<ReturnType<typeof getAllCategories>>;
}

export default function CategoriesTable({
	cloudinary_key,
	initialCategories,
}: CategoriesTableProps) {
	const { data: categories = initialCategories } = useQuery({
		queryKey: queryKeys.dashboard.categories(),
		queryFn: () => getAllCategories(),
		initialData: initialCategories,
	});

	if (!categories) return null;

	return (
		<DataTable
			actionButtonText={
				<>
					<Plus size={15} />
					Create category
				</>
			}
			modalChildren={<CategoryDetails cloudinary_key={cloudinary_key} />}
			newTabLink='/dashboard/admin/categories/new'
			filterValue='name'
			data={categories}
			searchPlaceholder='Search category name...'
			columns={columns}
		/>
	);
}
