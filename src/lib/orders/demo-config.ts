function boundedInteger(value: string | undefined, fallback: number, max: number) {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? Math.min(max, parsed) : fallback;
}

export function demoFulfillmentAutomationEnabled() {
	return process.env.DEMO_FULFILLMENT_AUTOMATION_ENABLED?.toLowerCase() === 'true';
}

export function demoFulfillmentStepHours() {
	return Math.max(24, boundedInteger(process.env.DEMO_FULFILLMENT_STEP_HOURS, 24, 24 * 30));
}

export function demoFulfillmentBatchSize() {
	return boundedInteger(process.env.DEMO_FULFILLMENT_BATCH_SIZE, 100, 100);
}
