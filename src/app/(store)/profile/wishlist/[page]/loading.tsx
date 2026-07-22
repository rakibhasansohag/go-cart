import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistLoading() {
	return (
		<div className='bg-background py-4 px-4 sm:px-6 rounded-xl border border-border/10 shadow-sm'>
			<h1 className='text-lg mb-5 font-bold'>Your Wishlist</h1>
			<div className='grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='border p-4 rounded-2xl space-y-3 bg-background'>
						<Skeleton className='h-48 w-full rounded-xl' />
						<Skeleton className='h-4 w-5/6' />
						<Skeleton className='h-4 w-1/3' />
						<div className='flex gap-2 pt-2'>
							<Skeleton className='h-8 w-full rounded-md' />
							<Skeleton className='h-8 w-10 rounded-md' />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
