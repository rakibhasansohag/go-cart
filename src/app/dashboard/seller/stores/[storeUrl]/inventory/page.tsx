import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getStoreInventory, InventoryOverview } from '@/queries/inventory';
import InventoryView from './inventory-view';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

interface Props {
	params: Promise<{ storeUrl: string }>;
}

export default async function InventoryPage({ params }: Props) {
	const { storeUrl } = await params;

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
			<InventoryView storeUrl={storeUrl} initialData={inventoryData} />
		</Suspense>
	);
}

