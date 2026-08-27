'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type OverviewChartData = {
	label?: string;
	month?: string;
	revenue: number;
	orders: number;
};

interface OverviewChartProps {
	data: OverviewChartData[];
	title?: string;
	description?: string;
}

export default function OverviewChart({
	data,
	title = 'Revenue Overview',
	description = 'Monthly sales performance & order totals',
}: OverviewChartProps) {
	const maxRevenue = Math.max(...data.map((d) => d.revenue), 100);
	const hasRevenue = data.some((d) => d.revenue > 0);

	return (
		<Card className='shadow-sm border border-border/60'>
			<CardHeader className='flex flex-row items-center justify-between pb-2'>
				<div>
					<CardTitle className='text-lg font-semibold'>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<div className='flex items-center gap-2 text-xs text-muted-foreground'>
					<span className='w-3 h-3 rounded-sm bg-primary inline-block' />
					<span>Revenue ($)</span>
				</div>
			</CardHeader>
			<CardContent className='pt-4'>
				<div className='relative h-[220px] w-full flex flex-col justify-between'>
					{/* Background Grid lines */}
					<div className='absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-border/40 pb-6'>
						<div className='border-b border-dashed border-border/40 w-full flex justify-between items-center text-[10px] text-muted-foreground px-1'>
							<span>${maxRevenue.toLocaleString()}</span>
						</div>
						<div className='border-b border-dashed border-border/40 w-full flex justify-between items-center text-[10px] text-muted-foreground px-1'>
							<span>${Math.round(maxRevenue / 2).toLocaleString()}</span>
						</div>
						<div className='border-b border-dashed border-border/40 w-full flex justify-between items-center text-[10px] text-muted-foreground px-1'>
							<span>$0</span>
						</div>
					</div>

					{/* Bars Container */}
					<div className='relative z-10 h-[190px] w-full flex items-end justify-between gap-3 sm:gap-6 px-4'>
						{data.map((item, index) => {
							const heightPercentage =
								item.revenue > 0
									? Math.max((item.revenue / maxRevenue) * 100, 6)
									: 0;

							return (
								<div
									key={index}
									className='flex-1 flex flex-col items-center gap-2 group h-full justify-end relative'
								>
									{/* Tooltip on hover */}
									<div className='opacity-0 group-hover:opacity-100 transition-all duration-200 bg-popover text-popover-foreground text-xs rounded-md px-2.5 py-1.5 shadow-lg border border-border text-center absolute -top-12 z-20 whitespace-nowrap pointer-events-none'>
										<p className='font-bold text-primary'>
											${item.revenue.toLocaleString()}
										</p>
										<p className='text-[10px] text-muted-foreground'>
											{item.orders} {item.orders === 1 ? 'order' : 'orders'} ({item.label ?? item.month})
										</p>
									</div>

									{/* Bar Pillar */}
									<div className='w-full flex items-end h-full justify-center'>
										<div
											style={{
												height: item.revenue > 0 ? `${heightPercentage}%` : '2px',
											}}
											className={`w-full max-w-[42px] transition-all duration-300 rounded-t-sm ${
												item.revenue > 0
													? 'bg-gradient-to-t from-primary/40 to-primary group-hover:from-primary/70 group-hover:to-primary shadow-sm'
													: 'bg-muted-foreground/30 group-hover:bg-primary/50'
											}`}
										/>
									</div>

									{/* Month Label */}
									<span className='text-xs text-muted-foreground font-medium truncate max-w-full group-hover:text-foreground transition-colors'>
										{(item.label ?? item.month ?? '').split(' ')[0]}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{!hasRevenue && (
					<p className='text-xs text-muted-foreground text-center mt-3 italic'>
						No sales activity recorded for the selected range.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
