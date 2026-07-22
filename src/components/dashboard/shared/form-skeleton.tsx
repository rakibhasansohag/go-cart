import { Skeleton } from '@/components/ui/skeleton';

export default function FormSkeleton() {
	return (
		<div className='w-full max-w-4xl p-6 rounded-xl border border-border/60 bg-card space-y-6'>
			{/* Form Header */}
			<div className='space-y-2 border-b pb-4'>
				<Skeleton className='h-7 w-48 rounded-md' />
				<Skeleton className='h-4 w-80 rounded-md' />
			</div>

			{/* Form Fields Grid */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-24 rounded-md' />
					<Skeleton className='h-10 w-full rounded-md' />
				</div>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-24 rounded-md' />
					<Skeleton className='h-10 w-full rounded-md' />
				</div>
				<div className='space-y-2 md:col-span-2'>
					<Skeleton className='h-4 w-32 rounded-md' />
					<Skeleton className='h-24 w-full rounded-md' />
				</div>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-28 rounded-md' />
					<Skeleton className='h-10 w-full rounded-md' />
				</div>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-28 rounded-md' />
					<Skeleton className='h-10 w-full rounded-md' />
				</div>
			</div>

			{/* Button Skeleton */}
			<div className='flex justify-end pt-4 border-t'>
				<Skeleton className='h-10 w-32 rounded-md' />
			</div>
		</div>
	);
}
