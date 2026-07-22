import { Skeleton } from '@/components/ui/skeleton';

export default function DataTableSkeleton() {
	return (
		<div className='w-full space-y-4 p-4'>
			{/* Header / Search bar skeleton */}
			<div className='flex items-center justify-between gap-4 py-4'>
				<Skeleton className='h-10 w-72 rounded-md' />
				<Skeleton className='h-10 w-36 rounded-md' />
			</div>
			{/* Table body skeleton */}
			<div className='rounded-md border p-4 space-y-3'>
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className='flex items-center justify-between gap-4 py-3 border-b last:border-0'>
						<Skeleton className='h-12 w-12 rounded-full' />
						<Skeleton className='h-5 w-48 rounded-md' />
						<Skeleton className='h-5 w-32 rounded-md' />
						<Skeleton className='h-8 w-8 rounded-md' />
					</div>
				))}
			</div>
		</div>
	);
}
