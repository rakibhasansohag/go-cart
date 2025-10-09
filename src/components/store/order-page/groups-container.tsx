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
		<div>
			<section className='p-2 relative'>
				<div className='w-full space-y-4'>
					{groups.map((group, index) => {
						const deliveryInfo = deliveryDetails[index];
						{
							group.items.map((item, i) => {
								console.log('mapping group.item', {
									groupId: group.id,
									itemId: item.id,
									i,
								});
								return (
									<div key={item.id ?? `item-${group.id}-${i}`}>
										{item.name}
									</div>
								);
							});
						}

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
			</section>
		</div>
	);
}
