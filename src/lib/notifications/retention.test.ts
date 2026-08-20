import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  notificationDeliveryAudit: { findMany: vi.fn(), deleteMany: vi.fn() },
  notification: { findMany: vi.fn(), deleteMany: vi.fn() },
  emailOutbox: { findMany: vi.fn(), deleteMany: vi.fn() },
  rateLimitBucket: { findMany: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { cleanupNotificationDeliveryData } from "./retention";

describe("notification retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.notificationDeliveryAudit.findMany.mockResolvedValue([{ id: "audit" }]);
    dbMock.notification.findMany.mockResolvedValue([{ id: "notification" }]);
    dbMock.emailOutbox.findMany.mockResolvedValue([{ id: "outbox" }]);
    dbMock.rateLimitBucket.findMany.mockResolvedValue([{ key: "search:expired" }]);
    dbMock.notificationDeliveryAudit.deleteMany.mockResolvedValue({ count: 1 });
    dbMock.notification.deleteMany.mockResolvedValue({ count: 1 });
    dbMock.emailOutbox.deleteMany.mockResolvedValue({ count: 1 });
    dbMock.rateLimitBucket.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("cleans only the bounded set of expired shared limiter buckets", async () => {
    const result = await cleanupNotificationDeliveryData({
      retentionDays: 30,
      batchSize: 25,
    });

    expect(dbMock.rateLimitBucket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { key: true }, take: 25 }),
    );
    expect(dbMock.rateLimitBucket.deleteMany).toHaveBeenCalledWith({
      where: { key: { in: ["search:expired"] } },
    });
    expect(result).toMatchObject({
      retentionDays: 30,
      audits: 1,
      notifications: 1,
      outbox: 1,
      rateLimitBuckets: 1,
    });
  });
});
