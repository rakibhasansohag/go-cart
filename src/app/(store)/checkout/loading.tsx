import Header from '@/components/store/layout/header/header';
import { Skeleton } from '@/components/ui/skeleton';

export default function CheckoutLoading() {
	return (
		<>
			<Header />
			<main
				className='min-h-[calc(100vh-65px)] bg-f5 px-2'
				aria-busy='true'
				aria-label='Loading checkout'
			>
				<div className='mx-auto flex max-w-container flex-col gap-3 py-4 lg:flex-row'>
					<section className='flex-1 space-y-3' aria-label='Loading shipping and products'>
						<Skeleton className='h-44 w-full rounded-xl' />
						<Skeleton className='h-40 w-full rounded-xl' />
					</section>
					<aside className='w-full space-y-3 lg:w-[380px]' aria-label='Loading order summary'>
						<Skeleton className='h-64 w-full rounded-xl' />
						<Skeleton className='h-12 w-full rounded-xl' />
					</aside>
				</div>
				<span className='sr-only'>Preparing your checkout.</span>
			</main>
		</>
	);
}
