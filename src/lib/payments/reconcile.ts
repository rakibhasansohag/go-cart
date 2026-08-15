import { db } from '@/lib/db';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { assertPaymentAmount } from './security';
import { resolvePaymentStatus } from './status';
import { publishPaidOrderNotifications } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { awardCoins } from '@/lib/loyalty/coins';
import { createSettlementsForPaidOrder } from '@/lib/settlement/service';

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

async function runPaidPaymentSideEffects(input: {
	orderId: string;
	userId: string;
	provider: PaymentMethod;
	providerPaymentId: string;
	amount: number;
	currency: string;
	paidAt: Date;
	idempotencyKey: string;
}) {
	let sourceEventIds: string[] = [];
	try {
		// Notifications are idempotent, but they fan out into many reads and
		// writes. Keep them out of the payment-state transaction so slow
		// preferences/email work cannot expire the payment commit.
		sourceEventIds = await publishPaidOrderNotifications(db, {
			orderId: input.orderId,
			provider: input.provider,
			providerPaymentId: input.providerPaymentId,
			amount: input.amount,
			currency: input.currency,
			paidAt: input.paidAt,
		});
	} catch (error) {
		console.error('Paid-order notifications could not be published:', error);
	}

	try {
		await db.$transaction(
			(tx) => awardCoins(tx, {
				userId: input.userId,
				orderId: input.orderId,
				amountPaid: input.amount,
				idempotencyKey: input.idempotencyKey,
			}),
			{ maxWait: 10_000, timeout: 10_000 },
		);
	} catch (error) {
		console.error('Paid-order GoCoins award could not be completed:', error);
	}

	return sourceEventIds;
}

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
					return { duplicate: true, order, paymentDetails: order?.paymentDetails ?? null };
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

				return {
					duplicate: false,
					order: updatedOrder,
					paymentDetails,
				};
			},
			{ maxWait: 10_000, timeout: 30_000 },
		);
		let sourceEventIds: string[] = [];
		if (result.order?.paymentStatus === PaymentStatus.Paid && result.paymentDetails) {
			sourceEventIds = await runPaidPaymentSideEffects({
				orderId: result.order.id,
				userId: result.order.userId,
				provider: input.provider,
				providerPaymentId: input.providerPaymentId,
				amount: result.paymentDetails.amount ?? result.order.total,
				currency: result.paymentDetails.currency ?? 'USD',
				paidAt: result.paymentDetails.updatedAt,
				idempotencyKey: `earn:${input.providerEventId}`,
			});
		}
		scheduleEmailOutboxDispatch(sourceEventIds);
		if (!result.duplicate && result.order?.paymentStatus === PaymentStatus.Paid) {
			await createSettlementsForPaidOrder(result.order.id);
		}
		if (result.duplicate) {
			return { duplicate: true, order: result.order };
		}
		return {
			duplicate: result.duplicate,
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
