'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getAllAdminCoupons } from '@/queries/coupon';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { AdminCouponType } from '@/lib/types';

interface AdminCouponsTableProps {
	initialData?: {
		coupons: AdminCouponType[];
		totalCount: number;
		totalPages: number;
		page: number;
		limit: number;
	};
}

export default function AdminCouponsTable({ initialData }: AdminCouponsTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const [pageSize, setPageSize] = useState(initialData?.limit ?? 10);
	const [search, setSearch] = useState('');

	const { data, isFetching } = useQuery({
		queryKey: queryKeys.dashboard.adminCoupons(page, pageSize, search),
		queryFn: () => getAllAdminCoupons({ page, limit: pageSize, search }),
		initialData: page === 1 && pageSize === 10 && !search ? initialData : undefined,
	});

	const coupons = data?.coupons ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<DataTable
			filterValue='code'
			data={coupons}
			columns={columns}
			searchPlaceholder='Search coupon code or store name...'
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
