import { getStorePackingSlipDetails } from '@/queries/fulfillment';
import PackingSlipView from '@/components/dashboard/orders/packing-slip-view';
import { notFound } from 'next/navigation';

export default async function PackingSlipPage({
	params,
}: {
	params: Promise<{ storeUrl: string; orderId: string }>;
}) {
	const { storeUrl, orderId } = await params;

	try {
		const data = await getStorePackingSlipDetails(storeUrl, orderId);

		return <PackingSlipView data={data} storeUrl={storeUrl} />;
	} catch (error) {
		console.error('Failed to load packing slip:', error);
		notFound();
	}
}
