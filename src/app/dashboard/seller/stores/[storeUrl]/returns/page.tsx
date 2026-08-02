import { Suspense } from 'react';
import { getSellerReturns } from '@/queries/returns';
import SellerReturnsTable from '@/components/dashboard/returns/seller-returns-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default async function SellerReturnsPage({ params }: { params: Promise<{ storeUrl: string }> }) {
	const { storeUrl } = await params;
	const initialData = await getSellerReturns(storeUrl, 'ALL', 1, 10, '');
	return <main className='space-y-6'><header><h1 className='text-2xl font-bold tracking-tight'>Returns</h1><p className='mt-2 text-sm text-muted-foreground'>Review customer return requests, evidence, and eligible next decisions for this store.</p></header><Suspense fallback={<DataTableSkeleton />}><SellerReturnsTable storeUrl={storeUrl} initialData={initialData} /></Suspense></main>;
}
