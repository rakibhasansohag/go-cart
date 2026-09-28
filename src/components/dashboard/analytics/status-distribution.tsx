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
		bg: 'bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30',
		text: 'text-amber-700 dark:text-amber-300',
		bar: 'bg-gradient-to-r from-amber-500 to-amber-400',
	},
	PROCESSING: {
		bg: 'bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30',
		text: 'text-blue-700 dark:text-blue-300',
		bar: 'bg-gradient-to-r from-blue-600 to-cyan-500',
	},
	SHIPPED: {
		bg: 'bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30',
		text: 'text-purple-700 dark:text-purple-300',
		bar: 'bg-gradient-to-r from-purple-600 to-indigo-400',
	},
	DELIVERED: {
		bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30',
		text: 'text-emerald-700 dark:text-emerald-300',
		bar: 'bg-gradient-to-r from-emerald-600 to-teal-400',
	},
	CANCELLED: {
		bg: 'bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30',
		text: 'text-rose-700 dark:text-rose-300',
		bar: 'bg-gradient-to-r from-rose-600 to-pink-500',
	},
};

export default function StatusDistribution({
	data,
	title = 'Order Status Distribution',
	description = 'Current breakdown of processing & delivered orders',
}: StatusDistributionProps) {
	const total = data.reduce((sum, item) => sum + item.count, 0);

	return (
		<Card className='shadow-xs border border-border/80 dark:border-border/60 bg-card transition-colors'>
			<CardHeader>
				<CardTitle className='text-lg font-semibold tracking-tight text-foreground'>{title}</CardTitle>
				<CardDescription className='text-xs sm:text-sm text-muted-foreground'>{description}</CardDescription>
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
							bg: 'bg-muted border border-border',
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
									<span className='text-muted-foreground font-mono'>
										{item.count} ({percentage}%)
									</span>
								</div>
								<div className='w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-200/50 dark:border-white/5'>
									<div
										style={{ width: `${percentage}%` }}
										className={`h-full rounded-full transition-all duration-500 shadow-xs ${colors.bar}`}
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
