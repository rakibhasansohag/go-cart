'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getOrder } from '@/queries/order';
import OrderInfoCard from '@/components/store/cards/order/info';
import OrderTotalDetailsCard from '@/components/store/cards/order/total';
import OrderUserDetailsCard from '@/components/store/cards/order/user';
import OrderGroupsContainer from './groups-container';
import ShipmentTrackingTimeline from './shipment-tracking-timeline';
import OrderHeader from './header';
import OrderPayment from './payment';
import { useOrderStatusSync } from '@/hooks/use-order-status-sync';

export default function OrderPageView({ orderId }: { orderId: string }) {
	const { data: baseOrder } = useSuspenseQuery({
		queryKey: queryKeys.orders.detail(orderId),
		queryFn: () => getOrder(orderId),
	});

	const { data: statusSnapshots = [] } = useOrderStatusSync({
		orderIds: [orderId],
	});

	if (!baseOrder) {
		return (
			<div className='rounded-2xl border border-border bg-card p-8 text-center'>
				<h1 className='text-lg font-semibold'>Order unavailable</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					This order could not be loaded. Please return to your order history.
				</p>
			</div>
		);
	}

	const statusByGroup = new Map(
		statusSnapshots.map((snapshot) => [snapshot.id, snapshot]),
	);
	const orderSnapshot = statusSnapshots[0]?.order;
	const order = {
		...baseOrder,
		...orderSnapshot,
		groups: baseOrder.groups.map((group) => {
			const snapshot = statusByGroup.get(group.id);
			if (!snapshot) return group;
			return {
				...group,
				status: snapshot.status,
				packageStatus: snapshot.packageStatus,
				shipment:
					group.shipment && snapshot.shipment
						? { ...group.shipment, status: snapshot.shipment.status }
						: group.shipment,
			};
		}),
	};

	const totalItemsCount =
		order.groups.reduce(
			(total, group) =>
				total + (group._count?.items || group.items.length),
			0,
		) || 0;

	const deliveredItemsCount =
		order.groups.reduce(
			(total, group) =>
				total +
				group.items.filter((item) =>
					['Delivered', 'PickedUp'].includes(item.status),
				).length,
			0,
		) || 0;

	const rawSubTotal =
		order.groups.reduce((sum, group) => sum + group.subTotal, 0) ||
		order.subTotal;
	const totalShippingFees =
		order.groups.reduce((sum, group) => sum + group.shippingFees, 0) ||
		order.shippingFees;
	const isPendingPayment = ['Pending', 'Failed', 'Declined', 'Cancelled'].includes(
		order.paymentStatus,
	);
	const canRequestReturns = ['Paid', 'PartiallyRefunded'].includes(
		order.paymentStatus,
	);

	return (
		<>
			<OrderHeader order={order} />

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
				<div
					className={
						isPendingPayment ? 'lg:col-span-8 space-y-6' : 'space-y-6'
					}
				>
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

					<OrderGroupsContainer
						groups={order.groups}
						check={canRequestReturns}
					/>
					<ShipmentTrackingTimeline orderId={orderId} />
				</div>

				{isPendingPayment && (
					<aside
						className='lg:col-span-4 space-y-6 lg:sticky lg:top-6'
						aria-labelledby='complete-payment-heading'
					>
						<div className='bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 shadow-sm space-y-4'>
							<div>
								<h2
									id='complete-payment-heading'
									className='text-sm font-bold text-foreground'
								>
									Complete your payment
								</h2>
								<p className='mt-1 text-xs leading-5 text-muted-foreground'>
									Choose a secure provider below. Your order updates only after
									the provider confirms the payment.
								</p>
							</div>
							<OrderPayment orderId={order.id} amount={order.total} />
						</div>
					</aside>
				)}
			</div>
		</>
	);
}
