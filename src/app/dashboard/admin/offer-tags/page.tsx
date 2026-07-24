import { Suspense } from 'react';
import OfferTagsTable from './offer-tags-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllOfferTags } from '@/queries/offer-tag';

export default async function AdminOfferTagsPage() {
	const offerTags = await getAllOfferTags();

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<OfferTagsTable initialOfferTags={offerTags} />
		</Suspense>
	);
}
