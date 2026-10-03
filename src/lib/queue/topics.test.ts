import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { QUEUE_TOPICS } from './topics';

it('uses topic names accepted by the Vercel broker', () => {
	// External API contract: https://vercel.com/docs/queues/api#naming-constraints
	for (const topic of Object.values(QUEUE_TOPICS)) {
		expect(topic).toMatch(/^[A-Za-z0-9_-]+$/);
	}
});

it('registers consumers for the exact topics used by the publishers', () => {
	const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
		functions: Record<string, { experimentalTriggers: { type: string; topic: string }[] }>;
	};
	const consumers = {
		email: QUEUE_TOPICS.EMAIL_OUTBOX,
		notification: QUEUE_TOPICS.NOTIFICATION_FAN,
		inventory: QUEUE_TOPICS.INVENTORY_EVENTS,
		payment: QUEUE_TOPICS.PAYMENT_EVENTS,
		cron: QUEUE_TOPICS.CRON_JOBS,
		workflow: QUEUE_TOPICS.WORKFLOW_STEPS,
	};
	for (const [route, topic] of Object.entries(consumers)) {
		expect(config.functions[`src/app/api/queues/${route}/route.ts`].experimentalTriggers)
			.toEqual([{ type: 'queue/v2beta', topic }]);
	}
});
