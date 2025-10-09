import OrderInfoCard from '@/components/store/cards/order/info';
import OrderTotalDetailsCard from '@/components/store/cards/order/total';
import OrderUserDetailsCard from '@/components/store/cards/order/user';
import Header from '@/components/store/layout/header/header';
import OrderGroupsContainer from '@/components/store/order-page/groups-container';
import OrderHeader from '@/components/store/order-page/header';
import OrderPayment from '@/components/store/order-page/payment';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getOrder } from '@/queries/order';
import { redirect } from 'next/navigation';

export default async function OrderPage({
	params,
}: {
	params: { orderId: string } | Promise<{ orderId: string }>;
}) {
	const { orderId } = await params;
	const order = await getOrder(orderId);
	if (!order) return redirect('/');

	// Get the total count of items across all groups
	const totalItemsCount = order?.groups.reduce(
		(total, group) => total + group._count.items,
		0,
	);

	// Calculate the total number of delivered items
	const deliveredItemsCount = order?.groups.reduce((total, group) => {
		if (group.status === 'Delivered') {
			return total + group.items.length;
		}
		return total;
	}, 0);

	return (
		<div>
			<Header />
			<div className='p-2'>
				<OrderHeader order={order} />
				<div
					className={cn('order-area-3', {
						'order-area-3':
							order.paymentStatus !== 'Pending' &&
							order.paymentStatus !== 'Failed',
					})}
				>
					{/* Col 1 -> User, Oder details */}
					<div className='order-area-cards min-[1024px]:h-[calc(100vh-137px)] min-[1024px]:border-r overflow-y-auto flex flex-col gap-y-5 scrollbar '>
						<OrderUserDetailsCard
							details={{
								subTotal: order.subTotal,
								shippingFees: order.shippingFees,
								total: order.total,
							}}
						/>
						<OrderInfoCard
							totalItemsCount={totalItemsCount}
							deliveredItemsCount={deliveredItemsCount}
							paymentDetails={order.paymentDetails}
						/>
						{order.paymentStatus !== 'Pending' &&
							order.paymentStatus !== 'Failed' && (
								<OrderTotalDetailsCard
									details={{
										subTotal: order.subTotal,
										shippingFees: order.shippingFees,
										total: order.total,
									}}
								/>
							)}
					</div>
					{/* Col 2 -> Order Groups */}
					<div className='order-area-products min-[768px]:h-[calc(100vh-137px)] overflow-y-auto scrollbar '>
						<OrderGroupsContainer
							groups={order.groups}
							check={
								order.paymentStatus !== 'Pending' &&
								order.paymentStatus !== 'Failed'
							}
						/>
					</div>
					{/* Col 3 -> Payment Gateways*/}

					{/* // ERROR: IF THE HEIGHT IS HTE PROBELM WHEN BROWSER HEIHGT IS LESS THAN 137px if the subtotal and shopping fees doesn't show than we will remove the min-[1024px]:h-[calc(100vh-137px)] class */}
					{(order.paymentStatus === 'Pending' ||
						order.paymentStatus === 'Failed') && (
						<div className='order-area-payment min-[1024px]:h-[calc(100vh-137px)] min-[1024px]:border-l overflow-y-auto scrollbar px-2 py-4 space-y-5 flex flex-col justify-center'>
							<OrderTotalDetailsCard
								details={{
									subTotal: order.subTotal,
									shippingFees: order.shippingFees,
									total: order.total,
								}}
							/>
							<Separator />
							<OrderPayment orderId={order.id} amount={order.total} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
