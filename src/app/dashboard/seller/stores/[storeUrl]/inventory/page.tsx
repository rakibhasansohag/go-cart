import { redirect } from 'next/navigation';
import { getStoreInventory } from '@/queries/inventory';
import InventoryView from './inventory-view';

interface Props {
	params: Promise<{ storeUrl: string }>;
}

export default async function InventoryPage({ params }: Props) {
	const { storeUrl } = await params;

	if (!storeUrl) {
		redirect('/dashboard/seller');
	}

	const inventoryData = await getStoreInventory(storeUrl);

	return <InventoryView storeUrl={storeUrl} initialData={inventoryData} />;
}
