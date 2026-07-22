// React, Next.js
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

// Clerk
import { currentUser } from '@clerk/nextjs/server';

// Components
import Header from '@/components/dashboard/Header/Header';
import Sidebar from '@/components/dashboard/Sidebar/Sidebar';

export default async function AdminDashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Block non admins from accessing the admin dashboard
	const user = await currentUser();
	if (!user || user.privateMetadata.role !== 'ADMIN') redirect('/');
	return (
		<div className='w-full min-h-screen bg-background text-foreground flex'>
			{/* Sidebar */}
			<Sidebar isAdmin />
			<div className='w-full lg:ml-[300px] ml-0 flex flex-col min-w-0 transition-all'>
				{/* Header */}
				<Header isAdmin />
				<main className='w-full mt-[65px] p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden'>
					{children}
				</main>
			</div>
		</div>
	);
}
