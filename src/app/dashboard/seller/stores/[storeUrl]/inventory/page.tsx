import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getStoreInventory, InventoryOverview } from '@/queries/inventory';
import InventoryView from './inventory-view';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

interface Props {
	params: Promise<{ storeUrl: string }>;
	searchParams?: Promise<{ filter?: string }>;
}

export default async function InventoryPage({ params, searchParams }: Props) {
	const { storeUrl } = await params;
	const resolvedSearchParams = searchParams ? await searchParams : undefined;
	const initialFilter =
		resolvedSearchParams?.filter === 'low_stock' ||
		resolvedSearchParams?.filter === 'in_stock' ||
		resolvedSearchParams?.filter === 'out_of_stock'
			? resolvedSearchParams.filter
			: undefined;

	if (!storeUrl) {
		redirect('/dashboard/seller');
	}

	let inventoryData: InventoryOverview = {
		items: [],
		summary: {
			totalUnits: 0,
			lowStockCount: 0,
			outOfStockCount: 0,
			totalSKUs: 0,
		},
	};

	try {
		inventoryData = await getStoreInventory(storeUrl);
	} catch (error) {
		console.error('Error fetching inventory for store:', storeUrl, error);
	}

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<InventoryView
				storeUrl={storeUrl}
				initialData={inventoryData}
				initialFilter={initialFilter}
			/>
		</Suspense>
	);
}

