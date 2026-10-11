'use client';
import React from 'react';
import Animated404 from '@/components/shared/animated404';
import { Package, PlusCircle, ShoppingCart } from 'lucide-react';

export default function NotFound() {
	const suggestions = [
		{
			title: 'My stores',
			description: 'Choose a store to manage products and orders.',
			href: '/dashboard/seller/stores',
			icon: <Package className='w-5 h-5' />,
		},
		{
			title: 'Create a store',
			description: 'Set up another marketplace store.',
			href: '/dashboard/seller/stores/new',
			icon: <PlusCircle className='w-5 h-5' />,
		},
		{
			title: 'Seller guide',
			description: 'Learn how to manage your store.',
			href: '/documentation/seller-onboarding',
			icon: <ShoppingCart className='w-5 h-5' />,
		},
	];

	return (
		<Animated404
			title='Seller page not found'
			subtitle="We couldn't locate that seller page. Try these quick actions."
			suggestions={suggestions}
		/>
	);
}
