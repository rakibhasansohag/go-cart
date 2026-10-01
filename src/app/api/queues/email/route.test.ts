import { beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchEmailOutboxBatchMock } = vi.hoisted(() => ({
	dispatchEmailOutboxBatchMock: vi.fn(),
}));

vi.mock("@/lib/email/outbox", () => ({
	dispatchEmailOutboxBatch: dispatchEmailOutboxBatchMock,
}));

import { POST } from "./route";

describe("Email queue consumer route (/api/queues/email)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("processes valid envelope and dispatches outbox jobs for the source event", async () => {
		dispatchEmailOutboxBatchMock.mockResolvedValue({
			disabled: false,
			claimed: 1,
			sent: 1,
			failed: 0,
			skipped: 0,
		});

		const envelope = {
			eventKey: "queue:email:evt_123",
			eventType: "order.paid",
			aggregateType: "ORDER",
			aggregateId: "evt_123",
			actorUserId: "usr_1",
			timestamp: new Date().toISOString(),
			payload: {
				sourceEventId: "evt_123",
				orderId: "ord_abc",
			},
		};

		const request = new Request("http://localhost/api/queues/email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(envelope),
		});

		const response = await POST(request);
		expect(response.status).toBe(200);

		const data = (await response.json()) as {
			ok: boolean;
			eventKey: string;
			dispatched: { sent: number };
		};

		expect(data.ok).toBe(true);
		expect(data.eventKey).toBe("queue:email:evt_123");
		expect(data.dispatched.sent).toBe(1);
		expect(dispatchEmailOutboxBatchMock).toHaveBeenCalledWith({
			sourceEventIds: ["evt_123"],
		});
	});

	it("returns 500 if envelope fails validation", async () => {
		const request = new Request("http://localhost/api/queues/email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ invalid: true }),
		});

		const response = await POST(request);
		expect(response.status).toBe(500);

		const data = (await response.json()) as { ok: boolean; error: string };
		expect(data.ok).toBe(false);
		expect(dispatchEmailOutboxBatchMock).not.toHaveBeenCalled();
	});

	it("returns 500 when dispatchEmailOutboxBatch throws error", async () => {
		dispatchEmailOutboxBatchMock.mockRejectedValue(
			new Error("SMTP server unreachable"),
		);

		const envelope = {
			eventKey: "queue:email:evt_err",
			eventType: "order.paid",
			aggregateType: "ORDER",
			aggregateId: "evt_err",
			actorUserId: null,
			timestamp: new Date().toISOString(),
			payload: {
				sourceEventId: "evt_err",
			},
		};

		const request = new Request("http://localhost/api/queues/email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(envelope),
		});

		const response = await POST(request);
		expect(response.status).toBe(500);

		const data = (await response.json()) as { ok: boolean; error: string };
		expect(data.ok).toBe(false);
		expect(data.error).toBe("SMTP server unreachable");
	});
});
