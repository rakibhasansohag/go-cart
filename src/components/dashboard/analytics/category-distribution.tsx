'use client';

import { CategoryRevenueData } from '@/queries/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface CategoryDistributionProps {
	data: CategoryRevenueData[];
	title?: string;
	description?: string;
}

const categoryGradients = [
	'bg-gradient-to-r from-blue-600 to-indigo-500',
	'bg-gradient-to-r from-purple-600 to-pink-500',
	'bg-gradient-to-r from-emerald-600 to-teal-400',
	'bg-gradient-to-r from-amber-500 to-orange-400',
	'bg-gradient-to-r from-rose-500 to-red-400',
	'bg-gradient-to-r from-cyan-500 to-blue-400',
];

export default function CategoryDistribution({
	data,
	title = 'Catalog Category Distribution',
	description = 'Top five categories by catalog product count; percentages are among these categories',
}: CategoryDistributionProps) {
	const total = data.reduce((sum, item) => sum + item.value, 0);

	return (
		<Card className='shadow-xs border border-border/80 dark:border-border/60 bg-card transition-colors'>
			<CardHeader>
				<CardTitle className='text-lg font-semibold tracking-tight text-foreground flex items-center gap-2'>
					<Layers className='w-4 h-4 text-primary' />
					{title}
				</CardTitle>
				<CardDescription className='text-xs sm:text-sm text-muted-foreground'>{description}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{data.length === 0 ? (
					<p className='text-sm text-muted-foreground py-6 text-center'>
						No category catalog data available yet.
					</p>
				) : (
					data.map((item, index) => {
						const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
						const gradient = categoryGradients[index % categoryGradients.length];

						return (
							<div key={item.name} className='space-y-1.5'>
								<div className='flex items-center justify-between text-xs font-medium'>
									<span className='font-medium text-foreground truncate max-w-[200px]'>
										{item.name}
									</span>
									<span className='text-muted-foreground font-mono'>
										{item.value} products ({percentage}%)
									</span>
								</div>
								<div className='w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-200/50 dark:border-white/5'>
									<div
										style={{ width: `${percentage}%` }}
										className={`h-full rounded-full transition-all duration-500 shadow-xs ${gradient}`}
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
