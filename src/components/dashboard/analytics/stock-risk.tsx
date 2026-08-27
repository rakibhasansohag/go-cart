'use client';

import { AlertTriangle, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StockRiskSummary } from '@/queries/analytics';

interface StockRiskProps {
	data: StockRiskSummary;
}

export default function StockRisk({ data }: StockRiskProps) {
	const hasRisk = data.lowStockCount > 0 || data.outOfStockCount > 0;

	return (
		<Card className='border border-border/60 shadow-xs'>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-lg'>
					<AlertTriangle className='h-4 w-4 text-amber-500' />
					Inventory risk
				</CardTitle>
				<CardDescription>Stock levels for this store&apos;s variants and sizes</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3'>
				<div className='grid grid-cols-3 gap-2 text-center text-xs'>
					<div className='rounded-lg border border-border/50 bg-muted/20 p-2'>
						<div className='font-semibold text-foreground'>{data.totalUnits}</div>
						<div className='text-muted-foreground'>units</div>
					</div>
					<div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-2'>
						<div className='font-semibold text-amber-700 dark:text-amber-300'>{data.lowStockCount}</div>
						<div className='text-muted-foreground'>low</div>
					</div>
					<div className='rounded-lg border border-destructive/30 bg-destructive/10 p-2'>
						<div className='font-semibold text-destructive'>{data.outOfStockCount}</div>
						<div className='text-muted-foreground'>out</div>
					</div>
				</div>
				{!hasRisk ? (
					<div className='flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground'>
						<PackageCheck className='h-4 w-4 text-emerald-500' />
						No stock risks detected.
					</div>
				) : (
					<div className='space-y-2'>
						{data.items.map((item) => (
							<div key={item.id} className='flex items-center justify-between gap-3 rounded-lg border border-border/50 px-2.5 py-2 text-xs hover:bg-muted/40 transition-colors'>
								<div className='min-w-0'>
									<p className='truncate font-medium text-foreground'>{item.productName}</p>
									<p className='truncate text-muted-foreground'>{item.variantName} · {item.size} · {item.sku}</p>
								</div>
								<span className={`shrink-0 font-semibold ${item.quantity === 0 ? 'text-destructive' : 'text-amber-600 dark:text-amber-300'}`}>
									{item.quantity} left
								</span>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
