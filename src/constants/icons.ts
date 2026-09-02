import {
	BoxesIcon,
	BoxListIcon,
	CategoriesIcon,
	CreateStoreIcon,
	DashboardIcon,
	StoreIcon,
	SettingsIcon,
	ProductsIcon,
	InventoryIcon,
	CouponIcon,
	ShippingIcon,
	OfferIcon,
} from '@/components/dashboard/icons';
import {
	FolderTree,
	Landmark,
	Mail,
	RotateCcw,
	Settings2,
	UserRound,
	WalletCards,
	MessageCircleQuestion,
} from 'lucide-react';

export const icons = [
	{
		label: 'Dashboard',
		value: 'dashboard',
		path: DashboardIcon,
	},
	{
		label: 'Store',
		value: 'store',
		path: StoreIcon,
	},
	{
		label: 'Create Store',
		value: 'create-store',
		path: CreateStoreIcon,
	},
	{
		label: 'Box List',
		value: 'box-list',
		path: BoxListIcon,
	},
	{
		label: 'Boxes',
		value: 'boxes',
		path: BoxesIcon,
	},
	{
		label: 'Categories',
		value: 'categories',
		path: CategoriesIcon,
	},
	{
		label: 'Settings',
		value: 'settings',
		path: SettingsIcon,
	},
	{
		label: 'Sellers',
		value: 'sellers',
		path: UserRound,
	},
	{
		label: 'Returns',
		value: 'returns',
		path: RotateCcw,
	},
	{
		label: 'Sub-Categories',
		value: 'sub-categories',
		path: FolderTree,
	},
	{
		label: 'Email Templates',
		value: 'email-templates',
		path: Mail,
	},
	{
		label: 'Settlements',
		value: 'settlements',
		path: Landmark,
	},
	{
		label: 'Marketplace Settings',
		value: 'marketplace-settings',
		path: Settings2,
	},
	{
		label: 'Earnings',
		value: 'earnings',
		path: WalletCards,
	},
	{
		label: 'Products',
		value: 'products',
		path: ProductsIcon,
	},
	{
		label: 'Inventory',
		value: 'inventory',
		path: InventoryIcon,
	},
	{
		label: 'Coupon',
		value: 'coupon',
		path: CouponIcon,
	},
	{
		label: 'shipping',
		value: 'shipping',
		path: ShippingIcon,
	},
	{
		label: 'Offer',
		value: 'offer',
		path: OfferIcon,
	},
	{
		label: 'Q&A',
		value: 'questions',
		path: MessageCircleQuestion,
	},
];
