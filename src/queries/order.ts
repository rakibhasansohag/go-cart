'use server';

import { db } from '@/lib/db';
import {
	deriveGroupStatus,
	deriveOrderStatus,
	productStatusForOrderStatus,
} from '@/lib/orders/status-sync';
import { currentUser } from '@clerk/nextjs/server';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { updateTag } from 'next/cache';

// Function: getOrder
// Description: Retrieves a specific order by its ID and the current user's ID, including associated groups, items, store information,
//              item count, and shipping address.
// Parameters:
//   - params: orderId.
// Returns: Object containing order details with groups sorted by totalPrice in descending order.
export const getOrder = async (orderId: string) => {
	// Retrieve current user
	const user = await currentUser();

	// Check if user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	// Get order details, with groups, product items, and ordered by total price
	const order = await db.order.findUnique({
		where: {
			id: orderId,
			userId: user.id,
		},
		include: {
			groups: {
				include: {
					items: true,
					store: true,
					coupon: true,
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

	return order;
};

/**
 * @name updateOrderGroupStatus
 * @description - Updates the status of a specified order group.
 *              - Throws an error if the user is not authenticated or lacks seller privileges.
 * @access User
 * @param storeId - The store id of the seller to verify ownership.
 * @param groupId - The ID of the order group whose status is to be updated.
 * @param status - The new status to be set for the order.
 * @returns {Object} - Updated order status.
 */

export const updateOrderGroupStatus = async (
	storeId: string,
	groupId: string,
	status: OrderStatus,
) => {
	// Retrieve current user
	const user = await currentUser();

	// Check if user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	// Verify seller permission
	if (user.privateMetadata.role !== 'SELLER')
		throw new Error(
			'Unauthorized Access: Seller Privileges Required for Entry.',
		);

	const store = await db.store.findUnique({
		where: {
			id: storeId,
			userId: user.id,
		},
	});

	// Verify seller ownership
	if (!store) {
		throw new Error('Unauthorized Access !');
	}

	// Retrieve the order to be updated
	const order = await db.orderGroup.findUnique({
		where: {
			id: groupId,
			storeId: storeId,
		},
	});

	// Ensure order existence
	if (!order) throw new Error('Order not found.');

	const updatedStatus = await db.$transaction(async (tx) => {
		const updatedGroup = await tx.orderGroup.update({
			where: {
				id: groupId,
			},
			data: {
				status,
			},
		});
		const itemStatus = productStatusForOrderStatus(status);

		await tx.orderItem.updateMany({
			where: { orderGroupId: groupId },
			data: { status: itemStatus },
		});

		if (itemStatus === ProductStatus.Delivered) {
			await tx.orderItem.updateMany({
				where: {
					orderGroupId: groupId,
					deliveredAt: null,
				},
				data: { deliveredAt: new Date() },
			});
		}

		const groups = await tx.orderGroup.findMany({
			where: { orderId: order.orderId },
			select: { status: true },
		});

		await tx.order.update({
			where: { id: order.orderId },
			data: {
				orderStatus: deriveOrderStatus(groups.map((group) => group.status)),
			},
		});

		return updatedGroup.status;
	});

	updateTag('user-orders');

	return updatedStatus;
};

export const updateOrderItemStatus = async (
	storeId: string,
	orderItemId: string,
	status: ProductStatus,
) => {
	// Retrieve current user
	const user = await currentUser();

	// Check if user is authenticated
	if (!user) throw new Error('Unauthenticated.');

	// Verify seller permission
	if (user.privateMetadata.role !== 'SELLER')
		throw new Error(
			'Unauthorized Access: Seller Privileges Required for Entry.',
		);

	const store = await db.store.findUnique({
		where: {
			id: storeId,
			userId: user.id,
		},
	});

	// Verify seller ownership
	if (!store) {
		throw new Error('Unauthorized Access !');
	}

	// Retrieve the product item to be updated
	const product = await db.orderItem.findFirst({
		where: {
			id: orderItemId,
			orderGroup: {
				storeId,
			},
		},
		select: {
			id: true,
			deliveredAt: true,
			orderGroupId: true,
			orderGroup: {
				select: {
					orderId: true,
				},
			},
		},
	});

	// Ensure order existence
	if (!product) throw new Error('Order item not found.');

	const updatedStatus = await db.$transaction(async (tx) => {
		const updatedProduct = await tx.orderItem.update({
			where: {
				id: orderItemId,
			},
			data: {
				status,
				...(status === ProductStatus.Delivered && !product.deliveredAt
					? { deliveredAt: new Date() }
					: {}),
			},
		});

		const items = await tx.orderItem.findMany({
			where: { orderGroupId: product.orderGroupId },
			select: { status: true },
		});
		const groupStatus = deriveGroupStatus(items.map((item) => item.status));

		await tx.orderGroup.update({
			where: { id: product.orderGroupId },
			data: { status: groupStatus },
		});

		const groups = await tx.orderGroup.findMany({
			where: { orderId: product.orderGroup.orderId },
			select: { status: true },
		});

		await tx.order.update({
			where: { id: product.orderGroup.orderId },
			data: {
				orderStatus: deriveOrderStatus(groups.map((group) => group.status)),
			},
		});

		return updatedProduct.status;
	});

	updateTag('user-orders');

	return updatedStatus;
};
