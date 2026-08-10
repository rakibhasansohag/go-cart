'use server';

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { primaryShipmentFromAssignments } from '@/lib/shipments/compat';

// Function: getOrder
// Description: Retrieves a specific order by its ID and the current user's ID, including associated groups, items, store information,
//              item count, and shipping address.
// Parameters:
//   - params: orderId.
// Returns: Object containing order details with groups sorted by totalPrice in descending order.
export const getOrder = async (orderId: string) => {
	// Retrieve current user
	const { userId } = await auth();

	// Auth can briefly be unavailable while Clerk refreshes a session. Returning
	// null keeps speculative navigation and Fast Refresh from becoming a 500.
	if (!userId) return null;

	// Get order details, with groups, product items, and ordered by total price
	const order = await db.order.findUnique({
		where: {
			id: orderId,
			userId,
		},
		include: {
			groups: {
				include: {
					items: true,
					store: true,
					coupon: true,
					shipmentAssignments: {
						include: { shipment: true },
						orderBy: { createdAt: 'asc' },
					},
					cancellationRequests: {
						orderBy: { createdAt: 'desc' },
						take: 1,
					},
					fulfillmentEvents: {
						orderBy: { createdAt: 'asc' },
					},
					_count: {
						select: {
							items: true,
						},
					},
				},
				orderBy: {
					total: 'desc',
				},
			},
			shippingAddress: {
				include: {
					country: true,
					user: true,
				},
			},
			paymentDetails: true,
		},
	});

	return order
		? {
			...order,
			groups: order.groups.map(primaryShipmentFromAssignments),
		}
		: order;
};
