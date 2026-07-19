import { Skeleton } from '@/components/ui/skeleton';

export default function AddressesLoading() {
	return (
		<div className='bg-background py-4 px-6 rounded-xl mt-5'>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				{Array.from({ length: 2 }).map((_, i) => (
					<div key={i} className='border p-6 rounded-xl space-y-4 bg-background'>
						<div className='flex justify-between items-center'>
							<Skeleton className='h-4 w-28' />
							<Skeleton className='h-4 w-12 rounded-full' />
						</div>
						<div className='space-y-2'>
							<Skeleton className='h-4 w-full' />
							<Skeleton className='h-4 w-2/3' />
						</div>
						<div className='flex gap-2 pt-2'>
							<Skeleton className='h-8 w-20 rounded-md' />
							<Skeleton className='h-8 w-20 rounded-md' />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
