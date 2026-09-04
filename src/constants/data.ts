import { DashboardSidebarMenuInterface } from '@/lib/types';

export const adminDashboardSidebarOptions: DashboardSidebarMenuInterface[] = [
	{
		label: 'Dashboard',
		icon: 'dashboard',
		link: '/dashboard/admin',
	},
	{
		label: 'Stores',
		icon: 'store',
		link: '/dashboard/admin/stores',
	},
	{
		label: 'Sellers',
		icon: 'sellers',
		link: '/dashboard/admin/sellers',
	},
	{
		label: 'Orders',
		icon: 'box-list',
		link: '/dashboard/admin/orders',
	},
	{
		label: 'Returns & Refunds',
		icon: 'returns',
		link: '/dashboard/admin/returns',
	},
	{
		label: 'Categories',
		icon: 'categories',
		link: '/dashboard/admin/categories',
	},
	{
		label: 'Sub-Categories',
		icon: 'sub-categories',
		link: '/dashboard/admin/subCategories',
	},
	{
		label: 'Offer Tags',
		icon: 'offer',
		link: '/dashboard/admin/offer-tags',
	},
	{
		label: 'Coupons',
		icon: 'coupon',
		link: '/dashboard/admin/coupons',
	},
	{
		label: 'Email Templates',
		icon: 'email-templates',
		link: '/dashboard/admin/email-templates',
	},
	{
		label: 'Delivery Health',
		icon: 'shipping',
		link: '/dashboard/admin/delivery-health',
	},
	{
		label: 'Settlements',
		icon: 'settlements',
		link: '/dashboard/admin/settlements',
	},
	{
		label: 'Marketplace Settings',
		icon: 'marketplace-settings',
		link: '/dashboard/admin/settings',
	},
];

export const SellerDashboardSidebarOptions: DashboardSidebarMenuInterface[] = [
	{
		label: 'Dashboard',
		icon: 'dashboard',
		link: '',
	},
	{
		label: 'Products',
		icon: 'products',
		link: 'products',
	},
	{
		label: 'Orders',
		icon: 'box-list',
		link: 'orders',
	},
	{
		label: 'Returns',
		icon: 'returns',
		link: 'returns',
	},
	{
		label: 'Inventory',
		icon: 'inventory',
		link: 'inventory',
	},
	{
		label: 'Coupons',
		icon: 'coupon',
		link: 'coupons',
	},
	{
		label: 'Shipping',
		icon: 'shipping',
		link: 'shipping',
	},
	{
		label: 'Earnings',
		icon: 'earnings',
		link: 'earnings',
	},
	{
		label: 'Q&A',
		icon: 'questions',
		link: 'questions',
	},
	{
		label: 'Messages',
		icon: 'messages',
		link: 'messages',
	},
	{
		label: 'Settings',
		icon: 'settings',
		link: 'settings',
	},
];
