import { db } from '@/lib/db';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { assertPaymentAmount } from './security';
import { resolvePaymentStatus } from './status';
import { publishPaidOrderNotifications } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { awardCoins } from '@/lib/loyalty/coins';

export type ReconcilePaymentInput = {
	orderId: string;
	provider: PaymentMethod;
	providerEventId: string;
	providerPaymentId: string;
	providerCaptureId?: string | null;
	eventType: string;
	providerStatus: string;
	paymentStatus: PaymentStatus;
	amount?: number | null;
	currency?: string | null;
	verifyOrderAmount?: boolean;
	metadata?: Record<string, string | number | boolean | null>;
};

export async function reconcilePaymentEvent(input: ReconcilePaymentInput) {
	try {
		const result = await db.$transaction(
			async (tx) => {
				const existingEvent = await tx.paymentEvent.findUnique({
					where: { providerEventId: input.providerEventId },
				});

				if (existingEvent) {
					const order = await tx.order.findUnique({
						where: { id: existingEvent.orderId },
						include: { paymentDetails: true },
					});
					return { duplicate: true, order, sourceEventIds: [] as string[] };
				}

				const order = await tx.order.findUnique({
					where: { id: input.orderId },
					include: { paymentDetails: true },
				});

				if (!order) {
					throw new Error('Payment event references an unknown order.');
				}

				if (input.verifyOrderAmount && input.amount != null && input.currency) {
					assertPaymentAmount(order.total, input.amount, input.currency);
				}

				const nextStatus = resolvePaymentStatus(
					order.paymentStatus,
					input.paymentStatus,
				);
				const normalizedCurrency = (
					input.currency ??
					order.paymentDetails?.currency ??
					'USD'
				).toUpperCase();
				const storedAmount =
					input.paymentStatus === 'Paid' && input.amount != null
						? input.amount
						: (order.paymentDetails?.amount ?? order.total);

				await tx.paymentEvent.create({
					data: {
						orderId: order.id,
						provider: input.provider,
						providerEventId: input.providerEventId,
						providerPaymentId: input.providerPaymentId,
						eventType: input.eventType,
						status: input.providerStatus,
						amount: input.amount ?? null,
						currency: input.currency?.toUpperCase() ?? null,
						metadata: input.metadata
							? (input.metadata as Prisma.InputJsonValue)
							: undefined,
					},
				});

				const paymentDetails = await tx.paymentDetails.upsert({
					where: { orderId: order.id },
					update: {
						paymentInetntId: input.providerPaymentId,
						providerCaptureId:
							input.providerCaptureId ??
							order.paymentDetails?.providerCaptureId ??
							undefined,
						paymentMethod: input.provider,
						status: input.providerStatus,
						amount: storedAmount,
						currency: normalizedCurrency,
						userId: order.userId,
					},
					create: {
						orderId: order.id,
						userId: order.userId,
						paymentInetntId: input.providerPaymentId,
						providerCaptureId: input.providerCaptureId ?? null,
						paymentMethod: input.provider,
						status: input.providerStatus,
						amount: storedAmount,
						currency: normalizedCurrency,
					},
				});

				const updatedOrder = await tx.order.update({
					where: { id: order.id },
					data: {
						paymentStatus: nextStatus,
						paymentMethod: input.provider,
					},
					include: { paymentDetails: true },
				});

				let sourceEventIds: string[] = [];
				if (nextStatus === PaymentStatus.Paid) {
					sourceEventIds = await publishPaidOrderNotifications(tx, {
						orderId: order.id,
						provider: input.provider,
						providerPaymentId: input.providerPaymentId,
						amount: storedAmount,
						currency: normalizedCurrency,
						paidAt: paymentDetails.updatedAt,
					});

					await awardCoins(tx, {
						userId: order.userId,
						orderId: order.id,
						amountPaid: storedAmount,
						idempotencyKey: `earn:${input.providerEventId}`,
					});
				}

				return {
					duplicate: false,
					order: updatedOrder,
					paymentDetails,
					sourceEventIds,
				};
			},
			{ maxWait: 10_000, timeout: 30_000 },
		);
		scheduleEmailOutboxDispatch(result.sourceEventIds);
		if (result.duplicate) {
			return { duplicate: true, order: result.order };
		}
		return {
			duplicate: false,
			order: result.order,
			paymentDetails: result.paymentDetails,
		};
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			const existingEvent = await db.paymentEvent.findUnique({
				where: { providerEventId: input.providerEventId },
			});
			const order = existingEvent
				? await db.order.findUnique({
						where: { id: existingEvent.orderId },
						include: { paymentDetails: true },
					})
				: null;
			return { duplicate: true, order };
		}

		throw error;
	}
}
