import { Suspense } from 'react';
import OfferTagsTable from './offer-tags-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default function AdminOfferTagsPage() {
	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<OfferTagsTable />
		</Suspense>
	);
}
