'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllOfferTags } from '@/queries/offer-tag';
import OfferTagDetails from '@/components/dashboard/forms/offer-tag-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface OfferTagsTableProps {
	initialOfferTags?: any[];
}

export default function OfferTagsTable({ initialOfferTags }: OfferTagsTableProps) {
	const { data: offerTags = initialOfferTags } = useQuery({
		queryKey: queryKeys.dashboard.offerTags(),
		queryFn: () => getAllOfferTags(),
		initialData: initialOfferTags,
	});

	if (!offerTags) return null;

	return (
		<DataTable
			actionButtonText={
				<>
					<Plus size={15} />
					Create offer tag
				</>
			}
			newTabLink='/dashboard/admin/offer-tags/new'
			modalChildren={<OfferTagDetails />}
			filterValue='name'
			data={offerTags}
			searchPlaceholder='Search offer tag name...'
			columns={columns}
		/>
	);
}
