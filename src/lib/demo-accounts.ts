/** Public demo logins already displayed on the sign-in page. */
export const DEMO_ACCOUNTS = [
	{ role: 'Customer', email: 'user@email.com', password: '123456789', description: 'Browse products, place an order and try returns.', destination: '/profile/orders' },
	{ role: 'Seller', email: 'seller@email.com', password: '123456789', description: 'Manage your store, products, stock and orders.', destination: '/dashboard/seller' },
	{ role: 'Admin', email: 'admin@email.com', password: '123456789', description: 'Review stores, orders, returns and marketplace totals.', destination: '/dashboard/admin' },
] as const;
