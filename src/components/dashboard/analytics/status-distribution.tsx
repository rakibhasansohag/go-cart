'use client';

import { OrderStatusDistributionData } from '@/queries/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface StatusDistributionProps {
	data: OrderStatusDistributionData[];
	title?: string;
	description?: string;
}

const statusColorMap: Record<string, { bg: string; text: string; bar: string }> = {
	PENDING: {
		bg: 'bg-amber-500/10',
		text: 'text-amber-600 dark:text-amber-400',
		bar: 'bg-amber-500',
	},
	PROCESSING: {
		bg: 'bg-blue-500/10',
		text: 'text-blue-600 dark:text-blue-400',
		bar: 'bg-blue-500',
	},
	SHIPPED: {
		bg: 'bg-purple-500/10',
		text: 'text-purple-600 dark:text-purple-400',
		bar: 'bg-purple-500',
	},
	DELIVERED: {
		bg: 'bg-emerald-500/10',
		text: 'text-emerald-600 dark:text-emerald-400',
		bar: 'bg-emerald-500',
	},
	CANCELLED: {
		bg: 'bg-rose-500/10',
		text: 'text-rose-600 dark:text-rose-400',
		bar: 'bg-rose-500',
	},
};

export default function StatusDistribution({
	data,
	title = 'Order Status Distribution',
	description = 'Current breakdown of processing & delivered orders',
}: StatusDistributionProps) {
	const total = data.reduce((sum, item) => sum + item.count, 0);

	return (
		<Card className='shadow-sm border border-border/60'>
			<CardHeader>
				<CardTitle className='text-lg font-semibold'>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{data.length === 0 ? (
					<p className='text-sm text-muted-foreground py-6 text-center'>
						No order status data available yet.
					</p>
				) : (
					data.map((item) => {
						const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
						const colors = statusColorMap[item.status] || {
							bg: 'bg-muted',
							text: 'text-foreground',
							bar: 'bg-primary',
						};

						return (
							<div key={item.status} className='space-y-1.5'>
								<div className='flex items-center justify-between text-xs font-medium'>
									<span
										className={`px-2 py-0.5 rounded-md uppercase font-semibold text-[11px] ${colors.bg} ${colors.text}`}
									>
										{item.status}
									</span>
									<span className='text-muted-foreground'>
										{item.count} ({percentage}%)
									</span>
								</div>
								<div className='w-full h-2 bg-muted rounded-full overflow-hidden'>
									<div
										style={{ width: `${percentage}%` }}
										className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
									/>
								</div>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}
