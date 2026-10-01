import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QUEUE_TOPICS } from "./topics";
import { queueMessageEnvelopeSchema } from "./types";
import { publishToQueue } from "./publisher";

vi.mock("./client", () => {
	const sendMock = vi.fn().mockResolvedValue({ messageId: "msg_test_123" });
	return {
		getQueueClient: () => ({
			send: sendMock,
		}),
		__sendMock: sendMock,
	};
});

describe("Vercel Queue Infrastructure", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.VERCEL_QUEUE_TOKEN = "test-token";
		process.env.VERCEL_QUEUE_BASE_URL = "https://queue.vercel.app";
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.clearAllMocks();
	});

	it("validates valid queue message envelopes", () => {
		const validEnvelope = {
			eventKey: "evt_123",
			eventType: "payment.succeeded",
			aggregateType: "ORDER",
			aggregateId: "order_999",
			actorUserId: "user_456",
			timestamp: new Date().toISOString(),
			payload: {
				orderId: "order_999",
				amount: 5000,
			},
		};

		const parsed = queueMessageEnvelopeSchema.safeParse(validEnvelope);
		expect(parsed.success).toBe(true);
	});

	it("rejects envelopes missing required metadata fields", () => {
		const invalidEnvelope = {
			eventKey: "",
			eventType: "payment.succeeded",
			aggregateType: "",
			aggregateId: "order_999",
			actorUserId: null,
			timestamp: "",
			payload: {},
		};

		const parsed = queueMessageEnvelopeSchema.safeParse(invalidEnvelope);
		expect(parsed.success).toBe(false);
	});

	it("publishes envelope with idempotency key", async () => {
		const result = await publishToQueue({
			topic: QUEUE_TOPICS.PAYMENT_EVENTS,
			eventKey: "payment:succeeded:test_123",
			eventType: "payment.succeeded",
			aggregateType: "ORDER",
			aggregateId: "order_123",
			actorUserId: "user_1",
			payload: { amount: 100 },
		});

		expect(result).toBe("msg_test_123");
	});

	it("gracefully returns null if queue environment variables are absent", async () => {
		delete process.env.VERCEL_QUEUE_TOKEN;
		delete process.env.VERCEL_QUEUE_BASE_URL;

		const result = await publishToQueue({
			topic: QUEUE_TOPICS.EMAIL_OUTBOX,
			eventKey: "email:test:1",
			eventType: "order.paid",
			aggregateType: "ORDER",
			aggregateId: "order_1",
			payload: { email: "buyer@example.com" },
		});

		expect(result).toBeNull();
	});
});
