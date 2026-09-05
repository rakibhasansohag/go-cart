import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { getAdminInventoryOverview, AdminInventoryOverview } from '@/queries/inventory';
import AdminInventoryView from './admin-inventory-view';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default async function AdminInventoryPage() {
	const user = await currentUser();
	if (!user) {
		redirect('/sign-in');
	}

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	if (!dbUser || dbUser.role !== Role.ADMIN) {
		redirect('/dashboard/seller');
	}

	let initialData: AdminInventoryOverview = {
		summary: {
			totalUnits: 0,
			totalSKUs: 0,
			lowStockCount: 0,
			outOfStockCount: 0,
			affectedStoresCount: 0,
		},
		criticalItems: [],
		stores: [],
	};

	try {
		initialData = await getAdminInventoryOverview();
	} catch (error) {
		console.error('Failed to load admin inventory overview:', error);
	}

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<AdminInventoryView initialData={initialData} />
		</Suspense>
	);
}
