import { Skeleton } from '@/components/ui/skeleton';
import DataTableSkeleton from './table-skeleton';

export default function ShippingSkeleton() {
	return (
		<div className='w-full space-y-6'>
			{/* Default Shipping Settings Card Skeleton */}
			<div className='p-6 rounded-xl border border-border/60 bg-card space-y-4'>
				<Skeleton className='h-6 w-56 rounded-md' />
				<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
					<Skeleton className='h-10 w-full rounded-md' />
					<Skeleton className='h-10 w-full rounded-md' />
					<Skeleton className='h-10 w-full rounded-md' />
				</div>
			</div>

			{/* Shipping Rates Table Skeleton */}
			<DataTableSkeleton />
		</div>
	);
}
