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
		<div className='w-full h-full'>
			{/* Sidebar */}
			<Sidebar />
			<div className='ml-[300px]'>
				{/* Header */}
				<Header />
				<div className='w-full mt-[75px] p-4'>{children}</div>
			</div>
		</div>
	);
}
