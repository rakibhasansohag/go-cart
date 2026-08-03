import { Suspense } from 'react';
import { getAdminReturns } from '@/queries/returns';
import AdminReturnsTable from '@/components/dashboard/returns/admin-returns-table';

export default async function AdminReturnsPage() {
	const initialData = await getAdminReturns('ALL', 1, 10, '');
	return (
		<main className='space-y-6'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Returns &amp; refunds</h1>
				<p className='mt-2 text-sm text-muted-foreground'>Review return requests across every store and move approved returns through refund or exchange resolution.</p>
			</header>
			<Suspense fallback={<div className='h-72 animate-pulse rounded-xl border border-border bg-muted/30' />}>
				<AdminReturnsTable initialData={initialData} />
			</Suspense>
		</main>
	);
}
