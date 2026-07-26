import OrderInfoCard from '@/components/store/cards/order/info';
import OrderTotalDetailsCard from '@/components/store/cards/order/total';
import OrderUserDetailsCard from '@/components/store/cards/order/user';
import Header from '@/components/store/layout/header/header';
import OrderGroupsContainer from '@/components/store/order-page/groups-container';
import OrderHeader from '@/components/store/order-page/header';
import OrderPayment from '@/components/store/order-page/payment';
import { getOrder } from '@/queries/order';
import { redirect } from 'next/navigation';

export default async function OrderPage({
	params,
}: {
	params: Promise<{ orderId: string }>;
}) {
	const { orderId } = await params;
	const order = await getOrder(orderId);
	if (!order) return redirect('/');

	// Get total count of items across all groups
	const totalItemsCount =
		order?.groups.reduce(
			(total, group) => total + (group._count?.items || group.items.length),
			0,
		) || 0;

	// Calculate total number of delivered items
	const deliveredItemsCount =
		order?.groups.reduce((total, group) => {
			if (group.status === 'Delivered') {
				return total + group.items.length;
			}
			return total;
		}, 0) || 0;

	// Calculate raw subtotal and shipping fees across all store groups
	const rawSubTotal =
		order.groups.reduce((sum, group) => sum + group.subTotal, 0) ||
		order.subTotal;

	const totalShippingFees =
		order.groups.reduce((sum, group) => sum + group.shippingFees, 0) ||
		order.shippingFees;

	const isPendingPayment =
		order.paymentStatus === 'Pending' || order.paymentStatus === 'Failed';

	return (
		<div className='min-h-screen bg-background text-foreground flex flex-col'>
			<Header />

			<main className='flex-1 max-w-[1400px] w-full mx-auto py-6 px-4 md:px-6'>
				<OrderHeader order={order} />

				{/* Customer & Shipping Address Banner */}
				<div className='mb-6'>
					<OrderUserDetailsCard details={order.shippingAddress} />
				</div>

				<div
					className={
						isPendingPayment
							? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'
							: 'space-y-6'
					}
				>
					{/* Main Section */}
					<div className={isPendingPayment ? 'lg:col-span-8 space-y-6' : 'space-y-6'}>
						{/* Grid-2: Order Information & Order Summary Side-by-Side */}
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch'>
							<OrderInfoCard
								totalItemsCount={totalItemsCount}
								deliveredItemsCount={deliveredItemsCount}
								paymentDetails={order.paymentDetails}
								paymentStatus={order.paymentStatus}
							/>

							<OrderTotalDetailsCard
								details={{
									subTotal: rawSubTotal,
									shippingFees: totalShippingFees,
									total: order.total,
								}}
								orderId={order.id}
								allowCouponInput={isPendingPayment}
							/>
						</div>

						{/* Store Packages & Order Items */}
						<OrderGroupsContainer
							groups={order.groups}
							check={!isPendingPayment}
						/>
					</div>

					{/* Sidebar Section: Payment Gateways */}
					{isPendingPayment && (
						<div className='lg:col-span-4 space-y-6 sticky top-6'>
							<div className='bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 shadow-sm space-y-4'>
								<h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
									Complete Payment
								</h3>
								<OrderPayment orderId={order.id} amount={order.total} />
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
