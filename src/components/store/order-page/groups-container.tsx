import { OrderGroupWithItemsType } from '@/lib/types';
import { getShippingDatesRange } from '@/lib/utils';
import OrderGroupTable from './group-table';

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
					<OrderGroupTable
						key={`${group.id || 'group'}-${index}`}
						group={group}
						deliveryInfo={deliveryInfo}
						check={check}
					/>
				);
			})}
		</div>
	);
}
