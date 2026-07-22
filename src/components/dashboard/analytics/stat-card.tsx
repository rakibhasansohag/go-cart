'use client';

import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
	title: string;
	value: string | number;
	change?: number;
	changeLabel?: string;
	icon: LucideIcon;
	description?: string;
	iconBgColor?: string;
}

export default function StatCard({
	title,
	value,
	change,
	changeLabel = 'from last month',
	icon: Icon,
	description,
	iconBgColor = 'bg-primary/10 text-primary',
}: StatCardProps) {
	const isPositive = change !== undefined && change >= 0;

	return (
		<Card className='shadow-sm border border-border/60 hover:shadow-md transition-shadow'>
			<CardContent className='p-6'>
				<div className='flex items-center justify-between'>
					<div className='space-y-1'>
						<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							{title}
						</p>
						<h3 className='text-2xl font-bold tracking-tight'>{value}</h3>
					</div>
					<div
						className={`w-12 h-12 rounded-xl flex items-center justify-between shrink-0 p-3 ${iconBgColor}`}
					>
						<Icon className='w-6 h-6' />
					</div>
				</div>

				{(change !== undefined || description) && (
					<div className='mt-4 flex items-center text-xs text-muted-foreground gap-1.5'>
						{change !== undefined && (
							<span
								className={`inline-flex items-center font-semibold px-1.5 py-0.5 rounded-full text-xs ${
									isPositive
										? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
										: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
								}`}
							>
								{isPositive ? (
									<TrendingUp className='w-3 h-3 mr-1' />
								) : (
									<TrendingDown className='w-3 h-3 mr-1' />
								)}
								{isPositive ? `+${change}%` : `${change}%`}
							</span>
						)}
						<span>{description || changeLabel}</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
