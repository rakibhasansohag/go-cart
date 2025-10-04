// DB
import StoreDetails from '@/components/dashboard/forms/store-details';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

type StoreParams = { storeUrl: string };

export default async function SellerStoreSettingsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	// await the whole proxy first (Next 15 requirement)
	const { storeUrl } = await params;

	const storeDetails = await db.store.findUnique({
		where: {
			url: storeUrl,
		},
	});

	if (!storeDetails) redirect('/dashboard/seller/stores');

	return (
		<div>
			<StoreDetails data={storeDetails} />
		</div>
	);
}
