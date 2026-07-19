import { Skeleton } from '@/components/ui/skeleton';

export default function ReviewsLoading() {
	return (
		<div className='space-y-4 mt-5'>
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className='bg-background p-6 rounded-xl border space-y-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<Skeleton className='h-10 w-10 rounded-full' />
							<div className='space-y-2'>
								<Skeleton className='h-4 w-24' />
								<Skeleton className='h-3 w-32' />
							</div>
						</div>
						<Skeleton className='h-4 w-20' />
					</div>
					<div className='space-y-2'>
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-5/6' />
					</div>
				</div>
			))}
		</div>
	);
}
