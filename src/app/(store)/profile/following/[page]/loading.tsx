import { Skeleton } from '@/components/ui/skeleton';

export default function FollowingLoading() {
	return (
		<div className='bg-background py-4 px-4 sm:px-6 rounded-xl border border-border/10 shadow-sm'>
			<h1 className='text-lg mb-3 font-bold'>Stores you follow</h1>
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='border p-6 rounded-xl bg-background flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<Skeleton className='h-16 w-16 rounded-full' />
							<div className='space-y-2'>
								<Skeleton className='h-4 w-28' />
								<Skeleton className='h-3 w-40' />
							</div>
						</div>
						<Skeleton className='h-8 w-24 rounded-md' />
					</div>
				))}
			</div>
		</div>
	);
}
