import { OrdersTableSkeleton } from '@/components/store/profile/orders/orders-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
	return (
		<div>
			{/* Header skeleton */}
			<div className='pt-4 pb-3 px-6 bg-background space-y-4 rounded-xl shadow-sm border border-border/10'>
				<div className='flex items-center justify-between'>
					<div className='flex gap-x-6 h-10 items-center'>
						<Skeleton className='h-5 w-16' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-16' />
						<Skeleton className='h-5 w-16' />
					</div>
				</div>
				<div className='flex items-center justify-between gap-4 mt-3'>
					<Skeleton className='h-10 w-full max-w-[500px] rounded-xl' />
					<Skeleton className='h-10 w-44 rounded-xl' />
				</div>
			</div>
			<OrdersTableSkeleton />
		</div>
	);
}
