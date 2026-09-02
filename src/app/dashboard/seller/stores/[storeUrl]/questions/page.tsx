import { Suspense } from 'react';
import { getStoreProductQA } from '@/queries/qa';
import SellerQuestionsTable from './questions-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerQuestionsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const initialData = await getStoreProductQA(storeUrl, {
		page: 1,
		limit: 30,
		filter: 'all',
	});

	return (
		<main className='space-y-6'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Product Q&A</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					Answer customer questions about your products and manage public community responses.
				</p>
			</header>

			<Suspense fallback={<DataTableSkeleton />}>
				<SellerQuestionsTable storeUrl={storeUrl} initialData={initialData} />
			</Suspense>
		</main>
	);
}
