'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllSubCategories } from '@/queries/subCategory';
import { getAllCategories } from '@/queries/category';
import SubCategoryDetails from '@/components/dashboard/forms/subCategory-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface SubCategoriesTableProps {
	initialSubCategories?: any[];
	initialCategories?: any[];
}

export default function SubCategoriesTable({
	initialSubCategories,
	initialCategories = [],
}: SubCategoriesTableProps) {
	const { data: subCategories = initialSubCategories } = useQuery({
		queryKey: queryKeys.dashboard.subCategories(),
		queryFn: () => getAllSubCategories(),
		initialData: initialSubCategories,
	});

	const { data: categories = initialCategories } = useQuery({
		queryKey: queryKeys.dashboard.categories(),
		queryFn: () => getAllCategories(),
		initialData: initialCategories,
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
