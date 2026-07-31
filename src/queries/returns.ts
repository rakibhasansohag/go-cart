'use server';

import { auth } from '@clerk/nextjs/server';
import {
	Prisma,
	ReturnEvidenceType,
	ReturnReason,
	ReturnRequestStatus,
	ReturnResolution,
} from '@prisma/client';
import { db } from '@/lib/db';
import {
	INACTIVE_RETURN_STATUSES,
	RELEASED_RETURN_STATUSES,
	RETURN_RESPONSE_DAYS,
	RETURN_SHIPMENT_DAYS,
	addDays,
	assertReturnActorAccess,
	assertReturnEligibility,
	assertReturnTransition,
	calculateRefundBreakdown,
	toReturnActorRole,
} from '@/lib/returns/domain';

export type ReturnEvidenceInput = {
	type: ReturnEvidenceType;
	url: string;
	alt?: string;
};

export type CreateReturnRequestInput = {
	orderItemId: string;
	quantity: number;
	reason: ReturnReason;
	resolution: ReturnResolution;
	note?: string;
	evidence?: ReturnEvidenceInput[];
};

export type TransitionReturnRequestInput = {
	returnRequestId: string;
	toStatus: ReturnRequestStatus;
	note?: string;
};

const returnCandidateInclude = Prisma.validator<Prisma.OrderItemInclude>()({
	returnItems: {
		where: {
			returnRequest: {
				status: { notIn: RELEASED_RETURN_STATUSES },
			},
		},
		select: { quantity: true },
	},
	orderGroup: {
		include: {
			coupon: { select: { discount: true } },
			store: {
				select: {
					id: true,
					returnPolicy: true,
					returnsAccepted: true,
					returnWindowDays: true,
					returnShippingFees: true,
				},
			},
			order: {
				select: {
					id: true,
					userId: true,
					paymentStatus: true,
					paymentDetails: { select: { id: true, currency: true } },
				},
			},
		},
	},
});

function validateEvidence(evidence: ReturnEvidenceInput[] = []) {
	if (evidence.length > 5) {
		throw new Error('You can attach up to five evidence files.');
	}

	return evidence.map((file, index) => {
		if (!Object.values(ReturnEvidenceType).includes(file.type)) {
			throw new Error('Select a valid evidence type.');
		}

		let parsedUrl: URL;
		try {
			parsedUrl = new URL(file.url);
		} catch {
			throw new Error(`Evidence file ${index + 1} has an invalid URL.`);
		}

		if (parsedUrl.protocol !== 'https:') {
			throw new Error('Evidence files must use a secure HTTPS URL.');
		}
		if (parsedUrl.hostname !== 'res.cloudinary.com') {
			throw new Error('Evidence files must come from the GoCart uploader.');
		}

		const alt = file.alt?.trim() ?? '';
		if (alt.length > 200) {
			throw new Error('Evidence descriptions must be 200 characters or fewer.');
		}

		return {
			type: file.type,
			url: parsedUrl.toString(),
			alt,
		};
	});
}

function getClaimedQuantity(
	returnItems: Array<{
		quantity: number;
	}>,
) {
	return returnItems.reduce(
		(total, returnItem) => total + returnItem.quantity,
		0,
	);
}

export async function getReturnCandidate(orderItemId: string) {
	const { userId } = await auth();

	if (!userId) {
		throw new Error('Please sign in to request a return.');
	}

	const item = await db.orderItem.findFirst({
		where: {
			id: orderItemId,
			orderGroup: { order: { userId } },
		},
		include: returnCandidateInclude,
	});

	if (!item) {
		throw new Error('Order item not found or you do not have access to it.');
	}

	const claimedQuantity = getClaimedQuantity(item.returnItems);
	const deliveredAt = item.deliveredAt ?? item.updatedAt;
	const { store, order, coupon } = item.orderGroup;

	try {
		const eligibility = assertReturnEligibility({
			itemStatus: item.status,
			paymentStatus: order.paymentStatus,
			purchasedQuantity: item.quantity,
			claimedQuantity,
			requestedQuantity: 1,
			deliveredAt,
			returnsAccepted: store.returnsAccepted,
			returnWindowDays: store.returnWindowDays,
		});
		const amounts = Array.from(
			{ length: eligibility.availableQuantity },
			(_, index) => {
				const quantity = index + 1;
				return {
					quantity,
					breakdown: calculateRefundBreakdown({
						unitPrice: item.price,
						purchasedQuantity: item.quantity,
						requestedQuantity: quantity,
						itemShippingFee: item.shippingFee,
						couponDiscountPercent: coupon?.discount ?? 0,
						itemTaxAmount: 0,
						returnShippingFees: store.returnShippingFees,
					}),
				};
			},
		);

		return {
			eligible: true as const,
			message: null,
			availableQuantity: eligibility.availableQuantity,
			deadline: eligibility.deadline,
			amounts,
			item: {
				id: item.id,
				name: item.name,
				image: item.image,
				size: item.size,
				sku: item.sku,
				quantity: item.quantity,
				price: item.price,
			},
			order: {
				id: order.id,
				paymentStatus: order.paymentStatus,
			},
			store: {
				id: store.id,
				returnPolicy: item.orderGroup.store.returnPolicy,
				returnWindowDays: store.returnWindowDays,
				returnShippingFees: store.returnShippingFees,
			},
		};
	} catch (error) {
		return {
			eligible: false as const,
			message:
				error instanceof Error
					? error.message
					: 'This item is not eligible for return.',
			availableQuantity: 0,
			deadline: null,
			amounts: [],
			item: {
				id: item.id,
				name: item.name,
				image: item.image,
				size: item.size,
				sku: item.sku,
				quantity: item.quantity,
				price: item.price,
			},
			order: {
				id: order.id,
				paymentStatus: order.paymentStatus,
			},
			store: {
				id: store.id,
				returnPolicy: item.orderGroup.store.returnPolicy,
				returnWindowDays: store.returnWindowDays,
				returnShippingFees: store.returnShippingFees,
			},
		};
	}
}

export async function getCustomerReturns(
	status: ReturnRequestStatus | 'ALL' = 'ALL',
	page = 1,
	pageSize = 10,
) {
	const { userId } = await auth();

	if (!userId) {
		throw new Error('Please sign in to view your returns.');
	}

	const safePage = Math.max(1, Math.floor(page));
	const safePageSize = Math.min(20, Math.max(1, Math.floor(pageSize)));
	const normalizedStatus =
		status === 'ALL' || Object.values(ReturnRequestStatus).includes(status)
			? status
			: 'ALL';
	const where: Prisma.ReturnRequestWhereInput = {
		customerId: userId,
		...(normalizedStatus === 'ALL' ? {} : { status: normalizedStatus }),
	};

	const [requests, totalCount] = await Promise.all([
		db.returnRequest.findMany({
			where,
			include: {
				store: {
					select: { id: true, name: true, logo: true, url: true },
				},
				order: { select: { id: true } },
				items: {
					include: {
						orderItem: {
							select: {
								id: true,
								name: true,
								image: true,
								size: true,
								sku: true,
							},
						},
					},
				},
				events: {
					orderBy: { createdAt: 'desc' },
					take: 1,
				},
				_count: { select: { evidence: true } },
			},
			orderBy: { updatedAt: 'desc' },
			skip: (safePage - 1) * safePageSize,
			take: safePageSize,
		}),
		db.returnRequest.count({ where }),
	]);

	return {
		requests,
		totalCount,
		totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
		currentPage: safePage,
		pageSize: safePageSize,
	};
}

export async function getCustomerReturn(returnRequestId: string) {
	const { userId } = await auth();

	if (!userId) {
		throw new Error('Please sign in to view this return.');
	}

	return db.returnRequest.findFirst({
		where: {
			id: returnRequestId,
			customerId: userId,
		},
		include: {
			store: {
				select: {
					id: true,
					name: true,
					logo: true,
					url: true,
					returnPolicy: true,
				},
			},
			order: { select: { id: true, paymentStatus: true } },
			items: {
				include: {
					orderItem: true,
				},
			},
			evidence: { orderBy: { createdAt: 'asc' } },
			events: {
				include: {
					actor: {
						select: { id: true, name: true, picture: true },
					},
				},
				orderBy: { createdAt: 'asc' },
			},
		},
	});
}

export async function createReturnRequest(input: CreateReturnRequestInput) {
	const { userId } = await auth();

	if (!userId) {
		throw new Error('Please sign in to request a return.');
	}

	if (!Object.values(ReturnReason).includes(input.reason)) {
		throw new Error('Select a valid return reason.');
	}
	if (!Object.values(ReturnResolution).includes(input.resolution)) {
		throw new Error('Select a valid return resolution.');
	}

	const note = input.note?.trim();
	if (note && note.length > 2000) {
		throw new Error('Return note must be 2,000 characters or fewer.');
	}
	const evidence = validateEvidence(input.evidence);

	try {
		return await db.$transaction(async (tx) => {
			const item = await tx.orderItem.findFirst({
				where: {
					id: input.orderItemId,
					orderGroup: { order: { userId } },
				},
				include: returnCandidateInclude,
			});

			if (!item) {
				throw new Error(
					'Order item not found or you do not have access to it.',
				);
			}

			const claimedQuantity = getClaimedQuantity(item.returnItems);
			const deliveredAt = item.deliveredAt ?? item.updatedAt;
			const { store, order, coupon } = item.orderGroup;

			assertReturnEligibility({
				itemStatus: item.status,
				paymentStatus: order.paymentStatus,
				purchasedQuantity: item.quantity,
				claimedQuantity,
				requestedQuantity: input.quantity,
				deliveredAt,
				returnsAccepted: store.returnsAccepted,
				returnWindowDays: store.returnWindowDays,
			});

			const breakdown = calculateRefundBreakdown({
				unitPrice: item.price,
				purchasedQuantity: item.quantity,
				requestedQuantity: input.quantity,
				itemShippingFee: item.shippingFee,
				couponDiscountPercent: coupon?.discount ?? 0,
				itemTaxAmount: 0,
				returnShippingFees: store.returnShippingFees,
			});
			const now = new Date();

			return tx.returnRequest.create({
				data: {
					reason: input.reason,
					resolution: input.resolution,
					customerNote: note || null,
					requestedAmount: breakdown.total,
					requestedSubtotal: breakdown.itemSubtotal,
					requestedShipping: breakdown.shipping,
					requestedDiscount: breakdown.couponDiscount,
					requestedTax: breakdown.tax,
					currency:
						order.paymentDetails?.currency?.toUpperCase() ?? 'USD',
					respondBy: addDays(now, RETURN_RESPONSE_DAYS),
					customerId: userId,
					orderId: order.id,
					orderGroupId: item.orderGroupId,
					storeId: store.id,
					paymentDetailsId: order.paymentDetails?.id ?? null,
					items: {
						create: {
							orderItemId: item.id,
							quantity: input.quantity,
							unitAmount: item.price,
							shippingAmount: breakdown.shipping,
							discountAmount: breakdown.couponDiscount,
							taxAmount: breakdown.tax,
							requestedAmount: breakdown.total,
							activeRequestKey: item.id,
						},
					},
					events: {
						create: {
							actorRole: 'CUSTOMER',
							actorId: userId,
							eventType: 'return.requested',
							toStatus: 'REQUESTED',
							note: note || null,
							metadata: {
								quantity: input.quantity,
								breakdown,
							},
						},
					},
					evidence:
						evidence.length > 0
							? {
									create: evidence.map((file) => ({
										...file,
										uploadedById: userId,
									})),
								}
							: undefined,
				},
				include: {
					items: true,
					evidence: true,
					events: { orderBy: { createdAt: 'asc' } },
				},
			});
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			throw new Error(
				'An active return request already exists for this order item.',
			);
		}
		throw error;
	}
}

export async function transitionReturnRequest(
	input: TransitionReturnRequestInput,
) {
	const { userId } = await auth();

	if (!userId) {
		throw new Error('Please sign in to update a return request.');
	}

	if (!Object.values(ReturnRequestStatus).includes(input.toStatus)) {
		throw new Error('Select a valid return status.');
	}

	const actor = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (!actor) {
		throw new Error('Authenticated user profile was not found.');
	}

	const note = input.note?.trim();
	if (note && note.length > 2000) {
		throw new Error('Return note must be 2,000 characters or fewer.');
	}

	return db.$transaction(async (tx) => {
		const request = await tx.returnRequest.findUnique({
			where: { id: input.returnRequestId },
			include: {
				store: {
					select: { userId: true, returnWindowDays: true },
				},
			},
		});

		if (!request) {
			throw new Error('Return request not found.');
		}

		const actorRole =
			userId === request.customerId
				? ('CUSTOMER' as const)
				: toReturnActorRole(actor.role);
		assertReturnActorAccess({
			actorId: userId,
			actorRole,
			customerId: request.customerId,
			storeOwnerId: request.store.userId,
		});
		assertReturnTransition(request.status, input.toStatus, actorRole);

		if (
			['MORE_INFO_REQUIRED', 'REJECTED', 'ESCALATED'].includes(
				input.toStatus,
			) &&
			!note
		) {
			throw new Error('A note is required for this return decision.');
		}

		const now = new Date();
		const data: Prisma.ReturnRequestUpdateManyMutationInput = {
			status: input.toStatus,
		};

		if (input.toStatus === 'APPROVED') {
			data.returnBy = addDays(now, RETURN_SHIPMENT_DAYS);
		}
		if (input.toStatus === 'MORE_INFO_REQUIRED') {
			data.respondBy = addDays(now, RETURN_RESPONSE_DAYS);
		}
		if (input.toStatus === 'ESCALATED') data.escalatedAt = now;
		if (
			['REJECTED', 'REFUNDED', 'EXCHANGED', 'CANCELLED'].includes(
				input.toStatus,
			)
		) {
			data.resolvedAt = now;
		}
		if (input.toStatus === 'CLOSED') data.closedAt = now;

		const updated = await tx.returnRequest.updateMany({
			where: {
				id: request.id,
				status: request.status,
			},
			data,
		});

		if (updated.count !== 1) {
			throw new Error(
				'This return request changed while you were reviewing it. Refresh and try again.',
			);
		}

		if (INACTIVE_RETURN_STATUSES.includes(input.toStatus)) {
			await tx.returnItem.updateMany({
				where: { returnRequestId: request.id },
				data: { activeRequestKey: null },
			});
		}

		await tx.returnEvent.create({
			data: {
				returnRequestId: request.id,
				actorRole,
				actorId: userId,
				eventType: 'return.status_changed',
				fromStatus: request.status,
				toStatus: input.toStatus,
				note: note || null,
			},
		});

		return tx.returnRequest.findUniqueOrThrow({
			where: { id: request.id },
			include: {
				items: true,
				events: { orderBy: { createdAt: 'asc' } },
			},
		});
	});
}
