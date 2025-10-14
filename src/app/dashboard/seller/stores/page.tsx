import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

async function SellerStoresPage() {
	// Fetch the current user
	const user = await currentUser();

	if (!user) {
		redirect('/');
		return null;
	}

	// Verify seller role
	if (user.privateMetadata.role !== 'SELLER') {
		redirect('/');
		return null;
	}

	// Retrieve stores
	const stores = await db.store.findMany({
		where: {
			userId: user.id,
		},
	});

	// If no stores, redirect to create new store
	if (stores.length === 0) {
		redirect('/dashboard/seller/stores/new');
		return null;
	}

	// If stores exist, redirect to first store
	redirect(`/dashboard/seller/stores/${stores[0].url}`);

	return null;
}

export default SellerStoresPage;
