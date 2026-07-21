// React,Next.js
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

// Components
import Header from '@/components/dashboard/Header/Header';
import Sidebar from '@/components/dashboard/Sidebar/Sidebar';

// Clerk
import { currentUser } from '@clerk/nextjs/server';

// DB
import { db } from '@/lib/db';

export default async function SellerStoreDashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Fetch the current user. If the user is not authenticated, redirect them to the home page.
	const user = await currentUser();
	if (!user) {
		redirect('/');
		return; // Ensure no further code is executed after redirect
	}

	// Retrieve the list of stores associated with the authenticated user.
	const stores = await db.store.findMany({
		where: {
			userId: user.id,
		},
	});

	return (
		<div className='w-full min-h-screen bg-background text-foreground flex'>
			<Sidebar stores={stores} />
			<div className='w-full lg:ml-[300px] ml-0 flex flex-col min-w-0 transition-all'>
				<Header />
				<main className='w-full mt-[65px] p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden'>
					{children}
				</main>
			</div>
		</div>
	);
}
