import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewSkeleton() {
	return (
		<div className='space-y-6 w-full p-4 sm:p-6'>
			{/* Title Skeleton */}
			<div className='space-y-2'>
				<Skeleton className='h-8 w-64 rounded-md' />
				<Skeleton className='h-4 w-96 rounded-md' />
			</div>

			{/* 4 Stat Cards Grid Skeleton */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='p-6 rounded-xl border border-border/60 space-y-3 bg-card'>
						<div className='flex items-center justify-between'>
							<Skeleton className='h-4 w-28 rounded-md' />
							<Skeleton className='h-10 w-10 rounded-xl' />
						</div>
						<Skeleton className='h-7 w-20 rounded-md' />
						<Skeleton className='h-3 w-32 rounded-md' />
					</div>
				))}
			</div>

			{/* Charts & Analytics Grid Skeleton */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				<div className='lg:col-span-2 p-6 rounded-xl border border-border/60 space-y-4 bg-card'>
					<Skeleton className='h-6 w-48 rounded-md' />
					<Skeleton className='h-4 w-72 rounded-md' />
					<Skeleton className='h-[220px] w-full rounded-lg' />
				</div>
				<div className='lg:col-span-1 p-6 rounded-xl border border-border/60 space-y-4 bg-card'>
					<Skeleton className='h-6 w-40 rounded-md' />
					<Skeleton className='h-4 w-56 rounded-md' />
					<div className='space-y-3 pt-2'>
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className='flex items-center gap-3'>
								<Skeleton className='h-8 w-8 rounded-full' />
								<div className='space-y-1 flex-1'>
									<Skeleton className='h-4 w-24 rounded-md' />
									<Skeleton className='h-3 w-16 rounded-md' />
								</div>
								<Skeleton className='h-5 w-14 rounded-md' />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
