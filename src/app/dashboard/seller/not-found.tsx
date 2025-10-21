'use client';
import React from 'react';
import Animated404 from '@/components/shared/animated404';
import { Package, PlusCircle, ShoppingCart } from 'lucide-react';

export default function NotFound() {
	const suggestions = [
		{
			title: 'My products',
			description: 'See and edit your listings.',
			href: '/dashboard/seller/products',
			icon: <Package className='w-5 h-5' />,
		},
		{
			title: 'Add new product',
			description: 'Create a fresh product listing.',
			href: '/dashboard/seller/products/new',
			icon: <PlusCircle className='w-5 h-5' />,
		},
		{
			title: 'Orders',
			description: 'View recent orders and shipments.',
			href: '/dashboard/seller/orders',
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
