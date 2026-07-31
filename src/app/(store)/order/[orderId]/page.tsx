import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import Header from '@/components/store/layout/header/header';
import OrderPageView from '@/components/store/order-page/order-page-view';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getOrder } from '@/queries/order';
import { auth } from '@clerk/nextjs/server';

export default async function OrderPage({
	params,
}: {
	params: Promise<{ orderId: string }>;
}) {
	const { orderId } = await params;
	const { userId } = await auth();
	if (!userId) {
		redirect(
			`/sign-in?redirect_url=${encodeURIComponent(`/order/${orderId}`)}`,
		);
	}
	const queryClient = getQueryClient();
	const order = await getOrder(orderId);

	if (!order) redirect('/');

	queryClient.setQueryData(queryKeys.orders.detail(orderId), order);

	return (
		<div className='min-h-screen bg-background text-foreground flex flex-col'>
			<Header />
			<main className='flex-1 max-w-[1400px] w-full mx-auto py-6 px-4 md:px-6'>
				<HydrationBoundary state={dehydrate(queryClient)}>
					<Suspense
						fallback={
							<div className='rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground'>
								Preparing your order and secure payment options…
							</div>
						}
					>
						<OrderPageView orderId={orderId} />
					</Suspense>
				</HydrationBoundary>
			</main>
		</div>
	);
}
