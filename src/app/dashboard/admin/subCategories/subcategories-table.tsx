'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllSubCategories } from '@/queries/subCategory';
import SubCategoryDetails from '@/components/dashboard/forms/subCategory-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { Category } from '@prisma/client';

interface SubCategoriesTableProps {
	categories: Category[];
}

export default function SubCategoriesTable({ categories }: SubCategoriesTableProps) {
	const { data: subCategories } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.subCategories(),
		queryFn: () => getAllSubCategories(),
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
