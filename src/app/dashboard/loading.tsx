import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
	return (
		<div className='w-full min-h-screen bg-background text-foreground flex overflow-hidden'>
			{/* Sidebar Skeleton (hidden on mobile, visible on desktop) */}
			<div className='hidden lg:flex flex-col w-[300px] border-r border-border p-4 space-y-6 fixed left-0 top-0 bottom-0 bg-card z-20'>
				<div className='flex items-center gap-3 px-2 py-3'>
					<Skeleton className='h-8 w-8 rounded-lg' />
					<Skeleton className='h-5 w-32 rounded-md' />
				</div>
				<div className='space-y-3 pt-4'>
					{Array.from({ length: 7 }).map((_, i) => (
						<div key={i} className='flex items-center gap-3 px-3 py-2'>
							<Skeleton className='h-5 w-5 rounded-md' />
							<Skeleton className='h-4 w-36 rounded-md' />
						</div>
					))}
				</div>
			</div>

			{/* Main Content Area Skeleton */}
			<div className='w-full lg:ml-[300px] ml-0 flex flex-col min-w-0 transition-all'>
				{/* Top Header Skeleton */}
				<div className='h-[65px] border-b border-border px-4 sm:px-6 flex items-center justify-between fixed top-0 right-0 left-0 lg:left-[300px] bg-background/80 backdrop-blur z-10'>
					<div className='flex items-center gap-3'>
						<Skeleton className='h-8 w-8 rounded-md lg:hidden' />
						<Skeleton className='h-5 w-40 rounded-md' />
					</div>
					<div className='flex items-center gap-3'>
						<Skeleton className='h-9 w-9 rounded-full' />
						<Skeleton className='h-9 w-9 rounded-full' />
					</div>
				</div>

				{/* Body Content Skeleton */}
				<main className='w-full mt-[65px] p-4 sm:p-6 lg:p-8 flex-1'>
					<OverviewSkeleton />
				</main>
			</div>
		</div>
	);
}
