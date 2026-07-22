import { Skeleton } from '@/components/ui/skeleton';

export default function ReviewsLoading() {
	return (
		<div className='bg-background py-4 px-4 sm:px-6 rounded-xl border border-border/10 shadow-sm'>
			<h1 className='text-lg mb-1 font-bold'>Your reviews</h1>
			{/* Header skeleton */}
			<div className='pt-1 pb-3 bg-background space-y-4 rounded-xl'>
				<div className='flex items-center justify-between'>
					<div className='flex gap-x-6 h-10 items-center'>
						<Skeleton className='h-5 w-16' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-12' />
					</div>
				</div>
				<div className='flex items-center justify-between gap-4 mt-3'>
					<Skeleton className='h-10 w-full max-w-[500px] rounded-xl' />
					<Skeleton className='h-10 w-44 rounded-xl' />
				</div>
			</div>
			{/* List skeleton */}
			<div className='space-y-4 mt-5'>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className='bg-background p-6 rounded-xl border border-border/40 space-y-4'>
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
		</div>
	);
}
