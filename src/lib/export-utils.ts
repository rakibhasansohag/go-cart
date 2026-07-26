import { StoreOrderType } from '@/lib/types';
import { formatOrderId } from '@/lib/utils';

export function exportOrdersToCSV(orders: StoreOrderType[], filenamePrefix = 'store-orders') {
	if (!orders || orders.length === 0) return;

	const headers = [
		'Order ID',
		'Date',
		'Customer Name',
		'Customer Email',
		'Payment Status',
		'Order Status',
		'Items Count',
		'Total Amount ($)',
	];

	const rows = orders.map((group) => {
		const address = group.order?.shippingAddress;
		const fullName = address ? `${address.firstName || ''} ${address.lastName || ''}`.trim() : 'Customer';
		const email = address?.user?.email || '';
		const dateStr = new Date(group.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});

		return [
			`"${formatOrderId(group.id)}"`,
			`"${dateStr}"`,
			`"${fullName.replace(/"/g, '""')}"`,
			`"${email.replace(/"/g, '""')}"`,
			`"${group.order?.paymentStatus || ''}"`,
			`"${group.status || ''}"`,
			group.items?.length || 0,
			group.total ? group.total.toFixed(2) : '0.00',
		];
	});

	const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	const dateStamp = new Date().toISOString().split('T')[0];
	link.setAttribute('href', url);
	link.setAttribute('download', `${filenamePrefix}-${dateStamp}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
