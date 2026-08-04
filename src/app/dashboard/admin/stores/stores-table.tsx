'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getAllStores } from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { AdminStoreType } from '@/lib/types';

interface StoresTableProps {
	initialData?: {
		stores: AdminStoreType[];
		totalCount: number;
		totalPages: number;
		page: number;
		limit: number;
	};
}

export default function StoresTable({ initialData }: StoresTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const initialPageSize = [5, 10, 20, 50].includes(initialData?.limit ?? 10) ? initialData?.limit ?? 10 : 10;
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [search, setSearch] = useState('');

	const { data, isFetching } = useQuery({
		queryKey: queryKeys.dashboard.stores(page, pageSize, search),
		queryFn: () => getAllStores({ page, limit: pageSize, search }),
		initialData: page === 1 && pageSize === 10 && !search && initialData?.limit === 10 ? initialData : undefined,
	});

	const stores = data?.stores ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<DataTable
			filterValue='name'
			data={stores}
			searchPlaceholder='Search store name, url or email...'
			columns={columns}
			// Server-side pagination
			totalCount={totalCount}
			pageCount={totalPages}
			pageIndex={page - 1}
			pageSize={pageSize}
			onPageChange={(newPage) => setPage(newPage)}
			onPageSizeChange={(newSize) => {
				setPageSize(newSize);
				setPage(1);
			}}
			onSearchChange={(newSearch) => {
				setSearch(newSearch);
				setPage(1);
			}}
			searchValue={search}
			isLoading={isFetching}
		/>
	);
}
