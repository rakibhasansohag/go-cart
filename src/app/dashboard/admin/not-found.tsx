'use client';
import React from 'react';
import Animated404 from '@/components/shared/animated404';
import { ShieldCheck, Users, Building } from 'lucide-react';

export default function NotFound() {
	const suggestions = [
		{
			title: 'All stores',
			description: 'Manage stores and approvals.',
			href: '/dashboard/admin/stores',
			icon: <Building className='w-5 h-5' />,
		},
		{
			title: 'Users list',
			description: 'View and manage users.',
			href: '/dashboard/admin/users',
			icon: <Users className='w-5 h-5' />,
		},
		{
			title: 'System health',
			description: 'Check background jobs & logs.',
			href: '/dashboard/admin/system',
			icon: <ShieldCheck className='w-5 h-5' />,
		},
	];

	return (
		<Animated404
			title='Admin page missing'
			subtitle="This admin route doesn't exist — maybe it was moved or removed."
			suggestions={suggestions}
		/>
	);
}
