'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getAllOfferTags } from '@/queries/offer-tag';
import OfferTagDetails from '@/components/dashboard/forms/offer-tag-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

export default function OfferTagsTable() {
	const { data: offerTags } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.offerTags(),
		queryFn: () => getAllOfferTags(),
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
