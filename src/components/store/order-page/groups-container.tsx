import { OrderGroupWithItemsType } from '@/lib/types';
import { getShippingDatesRange } from '@/lib/utils';
import OrderGroupTable from './group-table';
import ShipmentTrackingCard from './shipment-tracking-card';

export default function OrderGroupsContainer({
	groups,
	check,
}: {
	groups: OrderGroupWithItemsType[];
	check: boolean;
}) {
	const deliveryDetails = groups.map((group) => {
		const { minDate, maxDate } = getShippingDatesRange(
			group.shippingDeliveryMin,
			group.shippingDeliveryMax,
			group.createdAt,
		);
		return {
			shippingService: group.shippingService,
			deliveryMinDate: minDate,
			deliveryMaxDate: maxDate,
		};
	});

	return (
		<div className='w-full space-y-6'>
			{groups.map((group, index) => {
				const deliveryInfo = deliveryDetails[index];

				return (
					<div key={`${group.id || 'group'}-${index}`} className='space-y-4'>
						{group.shipment && (
							<ShipmentTrackingCard
								shipment={{
									...group.shipment,
									orderGroup: {
										id: group.id,
										packageStatus: group.packageStatus || 'PENDING',
										store: {
											name: group.store.name,
											url: group.store.url,
											logo: group.store.logo,
										},
									},
								}}
							/>
						)}
						<OrderGroupTable
							group={group}
							deliveryInfo={deliveryInfo}
							check={check}
						/>
					</div>
				);
			})}
		</div>
	);
}

