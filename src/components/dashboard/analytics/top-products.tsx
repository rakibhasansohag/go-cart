'use client';

import { TopSellingProductSummary, TopSellingVariantSummary } from '@/queries/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Trophy } from 'lucide-react';

interface TopProductsProps {
	products: TopSellingProductSummary[];
	variants?: TopSellingVariantSummary[];
	title?: string;
	description?: string;
}

export default function TopProducts({
	products,
	variants = [],
	title = 'Top Selling Products',
	description = 'Best-performing product items by total sales units',
}: TopProductsProps) {
	return (
		<Card className='shadow-xs border border-border/60'>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle className='text-lg font-semibold flex items-center gap-2'>
							<Trophy className='w-4 h-4 text-amber-500' />
							{title}
						</CardTitle>
						<CardDescription>{description}. Net is gross revenue less allocated platform commission.</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className='space-y-3'>
				{products.length === 0 ? (
					<p className='text-sm text-muted-foreground py-6 text-center'>
						No product sales recorded yet.
					</p>
				) : (
					products.map((item, rank) => (
						<div
							key={item.id}
							className='flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors'
						>
							<div className='flex items-center gap-3 min-w-0'>
								<span className='font-mono font-bold text-xs w-5 h-5 rounded-full bg-muted grid place-items-center shrink-0 text-muted-foreground'>
									{rank + 1}
								</span>
								<div className='relative w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0 bg-background'>
									<Image
										src={item.image || '/placeholder.png'}
										alt={item.name}
										fill
										className='object-cover'
									/>
								</div>
								<div className='min-w-0'>
									<Link
										href={`/product/${item.slug}`}
										target='_blank'
										className='font-semibold text-xs text-foreground hover:text-primary transition-colors truncate block flex items-center gap-1'
									>
										<span className='truncate'>{item.name}</span>
										<ExternalLink className='w-3 h-3 shrink-0 opacity-50' />
									</Link>
										<span className='text-[11px] text-muted-foreground'>
											{item.unitsSold} units · ${item.netRevenue.toFixed(2)} seller net
										</span>
								</div>
							</div>

							<div className='text-right shrink-0 ml-3'>
								<span className='font-bold text-xs text-foreground block'>
										{item.sales} sold · ${item.grossRevenue.toFixed(2)} gross
									</span>
							</div>
						</div>
					))
				)}
				{variants.length > 0 && (
					<div className='border-t border-border/60 pt-3'>
						<p className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Top variants</p>
						<div className='space-y-2'>
							{variants.slice(0, 5).map((variant, rank) => (
								<div key={variant.id} className='flex items-center justify-between gap-3 rounded-lg border border-border/40 px-2.5 py-2 text-xs hover:bg-muted/40 transition-colors'>
									<span className='min-w-0 truncate'><span className='mr-2 text-muted-foreground'>{rank + 1}.</span>{variant.productName} · {variant.sku}</span>
														<span className='shrink-0 text-right text-muted-foreground'>{variant.unitsSold} units · ${variant.netRevenue.toFixed(2)} seller net</span>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
