import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';

/**
 * Checks if a user has purchased the product with a paid or completed order.
 */
export async function isVerifiedBuyer(
	userId: string,
	productId: string,
): Promise<boolean> {
	if (!userId || !productId) return false;

	const matchingItem = await db.orderItem.findFirst({
		where: {
			productId,
			orderGroup: {
				order: {
					userId,
					paymentStatus: {
						in: [PaymentStatus.Paid, PaymentStatus.PartiallyRefunded],
					},
				},
			},
		},
		select: { id: true },
	});

	return Boolean(matchingItem);
}

/**
 * Checks if a user is the owner of the store that owns the given product.
 */
export async function isStoreSeller(
	userId: string,
	productId: string,
): Promise<boolean> {
	if (!userId || !productId) return false;

	const product = await db.product.findUnique({
		where: { id: productId },
		select: {
			store: {
				select: {
					userId: true,
				},
			},
		},
	});

	return product?.store?.userId === userId;
}
