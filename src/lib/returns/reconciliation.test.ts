import { describe, expect, it } from 'vitest';
import { settledQuantityForOrderItem, terminalStatusForSettledLine } from './reconciliation';

const line = (quantity: number, status: 'REFUNDED' | 'EXCHANGED', resolution: 'REFUND' | 'EXCHANGE' = 'REFUND') => ({ orderItemId: 'item-1', quantity, status, resolution });

describe('return inventory reconciliation', () => {
	it('keeps a delivered line open when only part of its quantity is settled', () => {
		const lines = [line(1, 'REFUNDED')];
		expect(settledQuantityForOrderItem(lines, 'item-1')).toBe(1);
		expect(terminalStatusForSettledLine({ originalQuantity: 3, settledQuantity: 1, lines, orderItemId: 'item-1' })).toBeNull();
	});

	it('aggregates multiple terminal requests before finalizing a line', () => {
		const lines = [line(1, 'REFUNDED'), line(2, 'REFUNDED')];
		expect(settledQuantityForOrderItem(lines, 'item-1')).toBe(3);
		expect(terminalStatusForSettledLine({ originalQuantity: 3, settledQuantity: 3, lines, orderItemId: 'item-1' })).toBe('Refunded');
	});

	it('marks a fully exchanged line as returned rather than refunded', () => {
		const lines = [line(2, 'EXCHANGED', 'EXCHANGE')];
		expect(terminalStatusForSettledLine({ originalQuantity: 2, settledQuantity: 2, lines, orderItemId: 'item-1' })).toBe('Returned');
	});
});
