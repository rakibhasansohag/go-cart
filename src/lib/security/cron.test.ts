import { afterEach, describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./cron";

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("cron request guard", () => {
  it("fails closed when no secret or bearer token is configured", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(new Request("https://gocart.example/api/cron/test"))).toBe(false);

    process.env.CRON_SECRET = "test-cron-secret";
    expect(isAuthorizedCronRequest(new Request("https://gocart.example/api/cron/test"))).toBe(false);
  });

  it("requires an exact bearer secret", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    expect(isAuthorizedCronRequest(new Request("https://gocart.example/api/cron/test", { headers: { authorization: "Bearer wrong" } }))).toBe(false);
    expect(isAuthorizedCronRequest(new Request("https://gocart.example/api/cron/test", { headers: { authorization: "Bearer test-cron-secret" } }))).toBe(true);
  });
});
