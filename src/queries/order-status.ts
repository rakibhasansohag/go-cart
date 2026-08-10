"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

const MAX_STATUS_IDS = 100;

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))].slice(0, MAX_STATUS_IDS);
}

/** A deliberately small projection used for cross-session fulfillment refreshes. */
export async function getOrderStatusSnapshots(input: {
  orderIds?: string[];
  groupIds?: string[];
}) {
  const user = await currentUser();
  // Polls can race with Clerk while a session is loading or switching tabs.
  // Fail closed without turning that expected transition into a server 500.
  if (!user) return [];

  const orderIds = uniqueIds(input.orderIds ?? []);
  const groupIds = uniqueIds(input.groupIds ?? []);
  if (orderIds.length === 0 && groupIds.length === 0) return [];

  const role = user.privateMetadata.role;
  const accessWhere: Prisma.OrderGroupWhereInput =
    role === "ADMIN"
      ? {}
      : role === "SELLER"
        ? { store: { userId: user.id } }
        : { order: { userId: user.id } };

  const snapshots = await db.orderGroup.findMany({
    where: {
      ...accessWhere,
      OR: [
        ...(groupIds.length ? [{ id: { in: groupIds } }] : []),
        ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
      ],
    },
    select: {
      id: true,
      orderId: true,
      status: true,
      packageStatus: true,
      shipmentAssignments: {
        select: { shipment: { select: { status: true } } },
        orderBy: { createdAt: "asc" },
      },
      order: {
        select: {
          orderStatus: true,
          paymentStatus: true,
        },
      },
    },
  });

  return snapshots.map(({ shipmentAssignments, ...snapshot }) => ({
    ...snapshot,
    shipment: shipmentAssignments[0]?.shipment ?? null,
  }));
}
