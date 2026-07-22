'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllSubCategories } from '@/queries/subCategory';
import { getAllCategories } from '@/queries/category';
import SubCategoryDetails from '@/components/dashboard/forms/subCategory-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

export default function SubCategoriesTable() {
	const { data: subCategories } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.subCategories(),
		queryFn: () => getAllSubCategories(),
	});

	const { data: categories = [] } = useQuery({
		queryKey: queryKeys.dashboard.categories(),
		queryFn: () => getAllCategories(),
		staleTime: 10 * 60 * 1000,
	});

	if (!subCategories) return null;

	return (
		<DataTable
			actionButtonText={
				<>
					<Plus size={15} />
					Create SubCategory
				</>
			}
			modalChildren={<SubCategoryDetails categories={categories} />}
			newTabLink='/dashboard/admin/subCategories/new'
			filterValue='name'
			data={subCategories}
			searchPlaceholder='Search subCategory name...'
			columns={columns}
		/>
	);
}
