import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function SellerDashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Block non sellers from accessing the seller dashboard
	const { userId } = await auth();
	if (!userId) redirect('/sign-in?redirect_url=/dashboard/seller');
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (user?.role !== 'SELLER') redirect('/');
	return <div>{children}</div>;
}
