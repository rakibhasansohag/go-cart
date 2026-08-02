import type {
	PaymentStatus,
	ProductStatus,
	ReturnActorRole,
	ReturnRequestStatus,
	Role,
} from '@prisma/client';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const RETURN_RESPONSE_DAYS = 3;
export const RETURN_SHIPMENT_DAYS = 14;

export const RELEASED_RETURN_STATUSES: ReturnRequestStatus[] = [
	'REJECTED',
	'CANCELLED',
];

export const INACTIVE_RETURN_STATUSES: ReturnRequestStatus[] = [
	'REJECTED',
	'REFUNDED',
	'EXCHANGED',
	'CANCELLED',
	'CLOSED',
];

export type ReturnRuleCode =
	| 'RETURNS_DISABLED'
	| 'ITEM_NOT_DELIVERED'
	| 'PAYMENT_NOT_REFUNDABLE'
	| 'RETURN_WINDOW_EXPIRED'
	| 'INVALID_QUANTITY'
	| 'QUANTITY_EXCEEDS_AVAILABLE'
	| 'INVALID_TRANSITION'
	| 'RETURN_ACCESS_DENIED';

export class ReturnRuleError extends Error {
	constructor(
		public readonly code: ReturnRuleCode,
		message: string,
	) {
		super(message);
		this.name = 'ReturnRuleError';
	}
}

export type ReturnEligibilityInput = {
	itemStatus: ProductStatus;
	paymentStatus: PaymentStatus;
	purchasedQuantity: number;
	claimedQuantity: number;
	requestedQuantity: number;
	deliveredAt: Date;
	returnsAccepted: boolean;
	returnWindowDays: number;
	now?: Date;
};

export type ReturnEligibility = {
	availableQuantity: number;
	deadline: Date;
};

export function assertReturnEligibility(
	input: ReturnEligibilityInput,
): ReturnEligibility {
	if (!input.returnsAccepted || input.returnWindowDays <= 0) {
		throw new ReturnRuleError(
			'RETURNS_DISABLED',
			'This store does not currently accept returns.',
		);
	}

	if (!['Delivered', 'PickedUp'].includes(input.itemStatus)) {
		throw new ReturnRuleError(
			'ITEM_NOT_DELIVERED',
			'Only delivered or picked-up items are eligible for return.',
		);
	}

	if (!['Paid', 'PartiallyRefunded'].includes(input.paymentStatus)) {
		throw new ReturnRuleError(
			'PAYMENT_NOT_REFUNDABLE',
			'The order payment is not eligible for a return.',
		);
	}

	if (
		!Number.isInteger(input.requestedQuantity) ||
		input.requestedQuantity <= 0
	) {
		throw new ReturnRuleError(
			'INVALID_QUANTITY',
			'Return quantity must be a positive whole number.',
		);
	}

	const availableQuantity = Math.max(
		0,
		input.purchasedQuantity - input.claimedQuantity,
	);

	if (input.requestedQuantity > availableQuantity) {
		throw new ReturnRuleError(
			'QUANTITY_EXCEEDS_AVAILABLE',
			`Only ${availableQuantity} item(s) remain eligible for return.`,
		);
	}

	const deadline = new Date(
		input.deliveredAt.getTime() + input.returnWindowDays * MS_PER_DAY,
	);
	const now = input.now ?? new Date();

	if (now.getTime() > deadline.getTime()) {
		throw new ReturnRuleError(
			'RETURN_WINDOW_EXPIRED',
			'The return window for this item has expired.',
		);
	}

	return { availableQuantity, deadline };
}

export type RefundBreakdownInput = {
	unitPrice: number;
	purchasedQuantity: number;
	requestedQuantity: number;
	itemShippingFee: number;
	couponDiscountPercent?: number;
	itemTaxAmount?: number;
	returnShippingFees: boolean;
};

export type RefundBreakdown = {
	itemSubtotal: number;
	shipping: number;
	couponDiscount: number;
	tax: number;
	total: number;
};

function toMoney(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertFiniteNonNegative(value: number, field: string) {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${field} must be a finite non-negative number.`);
	}
}

export function calculateRefundBreakdown(
	input: RefundBreakdownInput,
): RefundBreakdown {
	assertFiniteNonNegative(input.unitPrice, 'Unit price');
	assertFiniteNonNegative(input.itemShippingFee, 'Shipping fee');
	assertFiniteNonNegative(input.itemTaxAmount ?? 0, 'Tax amount');

	if (
		!Number.isInteger(input.purchasedQuantity) ||
		input.purchasedQuantity <= 0 ||
		!Number.isInteger(input.requestedQuantity) ||
		input.requestedQuantity <= 0 ||
		input.requestedQuantity > input.purchasedQuantity
	) {
		throw new Error('Refund quantities are invalid.');
	}

	const quantityRatio = input.requestedQuantity / input.purchasedQuantity;
	const itemSubtotal = toMoney(input.unitPrice * input.requestedQuantity);
	const shipping = input.returnShippingFees
		? toMoney(input.itemShippingFee * quantityRatio)
		: 0;
	const discountPercent = Math.min(
		100,
		Math.max(0, input.couponDiscountPercent ?? 0),
	);
	const couponDiscount = toMoney(
		(itemSubtotal + shipping) * (discountPercent / 100),
	);
	const tax = toMoney((input.itemTaxAmount ?? 0) * quantityRatio);
	const total = toMoney(
		Math.max(0, itemSubtotal + shipping + tax - couponDiscount),
	);

	return {
		itemSubtotal,
		shipping,
		couponDiscount,
		tax,
		total,
	};
}

type TransitionMap = Partial<
	Record<ReturnRequestStatus, readonly ReturnRequestStatus[]>
>;

const CUSTOMER_TRANSITIONS: TransitionMap = {
	REQUESTED: ['CANCELLED'],
	MORE_INFO_REQUIRED: ['UNDER_REVIEW', 'CANCELLED'],
	AWAITING_SHIPMENT: ['IN_TRANSIT'],
};

const SELLER_TRANSITIONS: TransitionMap = {
	REQUESTED: [
		'UNDER_REVIEW',
		'MORE_INFO_REQUIRED',
		'APPROVED',
		'REJECTED',
		'ESCALATED',
	],
	UNDER_REVIEW: [
		'MORE_INFO_REQUIRED',
		'APPROVED',
		'REJECTED',
		'ESCALATED',
	],
	MORE_INFO_REQUIRED: ['UNDER_REVIEW', 'REJECTED', 'ESCALATED'],
	APPROVED: ['AWAITING_SHIPMENT'],
	IN_TRANSIT: ['RECEIVED'],
	RECEIVED: ['REFUND_PENDING', 'EXCHANGE_PENDING', 'ESCALATED'],
};

const ADMIN_TRANSITIONS: TransitionMap = {
	...SELLER_TRANSITIONS,
	ESCALATED: ['MORE_INFO_REQUIRED', 'APPROVED', 'REJECTED'],
	REFUND_PENDING: ['REFUNDED'],
	EXCHANGE_PENDING: ['EXCHANGED'],
	REFUNDED: ['CLOSED'],
	EXCHANGED: ['CLOSED'],
};

const SYSTEM_TRANSITIONS: TransitionMap = {
	APPROVED: ['AWAITING_SHIPMENT'],
	RECEIVED: ['REFUND_PENDING', 'EXCHANGE_PENDING'],
	REFUND_PENDING: ['REFUNDED'],
	EXCHANGE_PENDING: ['EXCHANGED'],
	REFUNDED: ['CLOSED'],
	EXCHANGED: ['CLOSED'],
};

const TRANSITIONS_BY_ACTOR: Record<ReturnActorRole, TransitionMap> = {
	CUSTOMER: CUSTOMER_TRANSITIONS,
	SELLER: SELLER_TRANSITIONS,
	ADMIN: ADMIN_TRANSITIONS,
	SYSTEM: SYSTEM_TRANSITIONS,
};

export function assertReturnTransition(
	fromStatus: ReturnRequestStatus,
	toStatus: ReturnRequestStatus,
	actorRole: ReturnActorRole,
) {
	const allowed = TRANSITIONS_BY_ACTOR[actorRole][fromStatus] ?? [];

	if (!allowed.includes(toStatus)) {
		throw new ReturnRuleError(
			'INVALID_TRANSITION',
			`${actorRole.toLowerCase()} cannot move a return from ${fromStatus} to ${toStatus}.`,
		);
	}
}

export function getAllowedReturnTransitions(
	fromStatus: ReturnRequestStatus,
	actorRole: ReturnActorRole,
) {
	return [...(TRANSITIONS_BY_ACTOR[actorRole][fromStatus] ?? [])];
}

export function toReturnActorRole(role: Role): ReturnActorRole {
	if (role === 'ADMIN') return 'ADMIN';
	if (role === 'SELLER') return 'SELLER';
	return 'CUSTOMER';
}

export function assertReturnActorAccess(input: {
	actorId: string;
	actorRole: ReturnActorRole;
	customerId: string;
	storeOwnerId: string;
}) {
	if (
		input.actorRole === 'CUSTOMER' &&
		input.actorId !== input.customerId
	) {
		throw new ReturnRuleError(
			'RETURN_ACCESS_DENIED',
			'You do not have access to this return request.',
		);
	}

	if (
		input.actorRole === 'SELLER' &&
		input.actorId !== input.storeOwnerId
	) {
		throw new ReturnRuleError(
			'RETURN_ACCESS_DENIED',
			'You do not have access to this store return.',
		);
	}
}

export function addDays(date: Date, days: number) {
	return new Date(date.getTime() + days * MS_PER_DAY);
}
