import { Suspense } from 'react';
import { getSellerConversations } from '@/queries/messages';
import SellerMessagesInbox from './messages-inbox';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerMessagesPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const initialData = await getSellerConversations(storeUrl, { filter: 'all' });

	return (
		<main className='space-y-6'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Customer Messages</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					Read and respond to direct inquiries from shoppers regarding their orders and products.
				</p>
			</header>

			<Suspense fallback={<DataTableSkeleton />}>
				<SellerMessagesInbox storeUrl={storeUrl} initialData={initialData} />
			</Suspense>
		</main>
	);
}
