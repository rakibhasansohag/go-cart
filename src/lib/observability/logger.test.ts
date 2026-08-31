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

  it("emits JSON for an error event with sanitized context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logEvent("error", "app_render_error", {
      name: "TypeError",
      message: "Cannot read properties of undefined",
      digest: "digest-123",
    });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('"event":"app_render_error"'),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('"digest":"digest-123"'),
    );
    spy.mockRestore();
  });
});
