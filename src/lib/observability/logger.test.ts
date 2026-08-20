import { describe, expect, it, vi } from "vitest";

import { logEvent, redactLogContext } from "./logger";

describe("structured logger", () => {
  it("redacts secrets and user identifiers recursively", () => {
    expect(
      redactLogContext({
        requestId: "request-1",
        userId: "user-private",
        nested: { email: "person@example.com", orderId: "order-1" },
      }),
    ).toEqual({
      requestId: "request-1",
      userId: "[redacted]",
      nested: { email: "[redacted]", orderId: "order-1" },
    });
  });

  it("emits JSON for a safe correlation event", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logEvent("info", "request.completed", {
      requestId: "request-1",
      status: 200,
    });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"request-1"'),
    );
    spy.mockRestore();
  });
});
