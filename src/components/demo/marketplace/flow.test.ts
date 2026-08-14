import { describe, expect, it } from 'vitest';
import { FLOW_STAGES, nextStageIndex, progressPercent } from './flow';

describe('marketplace demo flow', () => {
	it('contains the complete funds-flow story in order', () => {
		expect(FLOW_STAGES.map((stage) => stage.id)).toEqual([
			'order',
			'hold',
			'delivery',
			'returns',
			'payday',
			'payout',
		]);
	});

	it('advances one step without passing the payout state', () => {
		expect(nextStageIndex(0)).toBe(1);
		expect(nextStageIndex(FLOW_STAGES.length - 1)).toBe(FLOW_STAGES.length - 1);
	});

	it('reports progress from zero to complete', () => {
		expect(progressPercent(0)).toBe(0);
		expect(progressPercent(2)).toBe(40);
		expect(progressPercent(FLOW_STAGES.length - 1)).toBe(100);
	});
});
