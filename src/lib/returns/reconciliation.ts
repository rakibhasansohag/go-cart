import type { ReturnRequestStatus, ReturnResolution } from '@prisma/client';

export type SettledReturnLine = {
	orderItemId: string;
	quantity: number;
	status: ReturnRequestStatus;
	resolution: ReturnResolution;
};

const SETTLED_STATUSES = new Set<ReturnRequestStatus>(['REFUNDED', 'EXCHANGED']);

export function settledQuantityForOrderItem(lines: readonly SettledReturnLine[], orderItemId: string) {
	return lines.reduce((total, line) => line.orderItemId === orderItemId && SETTLED_STATUSES.has(line.status) ? total + Math.max(0, line.quantity) : total, 0);
}

export function terminalStatusForSettledLine(input: { originalQuantity: number; settledQuantity: number; lines: readonly SettledReturnLine[]; orderItemId: string }) {
	if (input.settledQuantity < input.originalQuantity) return null;
	const settledLines = input.lines.filter((line) => line.orderItemId === input.orderItemId && SETTLED_STATUSES.has(line.status));
	return settledLines.length > 0 && settledLines.every((line) => line.resolution === 'REFUND') ? 'Refunded' : 'Returned';
}
