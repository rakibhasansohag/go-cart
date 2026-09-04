import {
  NotificationCategory,
  NotificationChannel,
  Prisma,
  Role,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { formatOrderId, formatPackageId } from "@/lib/orders/references";
import {
  demoFulfillmentAutomationEnabled,
  demoFulfillmentStepHours,
} from "@/lib/orders/demo-config";
import { validateDomainEventPayload } from "./contracts";

type NotificationDbClient = Prisma.TransactionClient | PrismaClient;

type DeliveryAuditInput = Pick<
  Prisma.NotificationDeliveryAuditUncheckedCreateInput,
  | "sourceEventId"
  | "recipientId"
  | "recipientEmail"
  | "channel"
  | "status"
  | "finishedAt"
>;

type NotificationInput = Pick<
  Prisma.NotificationUncheckedCreateInput,
  | "sourceEventId"
  | "recipientId"
  | "eventType"
  | "category"
  | "title"
  | "message"
  | "actionUrl"
>;

type EmailOutboxInput = Pick<
  Prisma.EmailOutboxUncheckedCreateInput,
  "sourceEventId" | "recipientId" | "recipientEmail" | "templateKey" | "payload"
>;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function ensureDeliveryAudit(
  tx: NotificationDbClient,
  input: DeliveryAuditInput,
) {
  const where = {
    sourceEventId_recipientId_channel_attemptNumber: {
      sourceEventId: input.sourceEventId,
      recipientId: input.recipientId,
      channel: input.channel,
      attemptNumber: 0,
    },
  };

  try {
    return await tx.notificationDeliveryAudit.upsert({
      where,
      update: {},
      create: { ...input, attemptNumber: 0 },
    });
  } catch (error) {
    // A replay can fan out on another worker between the upsert read and
    // write. The compound unique key selects the existing audit record.
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await tx.notificationDeliveryAudit.findUnique({ where });
    if (existing) return existing;
    throw error;
  }
}

async function ensureNotification(
  tx: NotificationDbClient,
  input: NotificationInput,
) {
  const where = {
    sourceEventId_recipientId: {
      sourceEventId: input.sourceEventId,
      recipientId: input.recipientId,
    },
  };

  try {
    return await tx.notification.upsert({ where, update: {}, create: input });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await tx.notification.findUnique({ where });
    if (existing) return existing;
    throw error;
  }
}

async function ensureEmailOutbox(
  tx: NotificationDbClient,
  input: EmailOutboxInput,
) {
  const where = {
    sourceEventId_recipientId: {
      sourceEventId: input.sourceEventId,
      recipientId: input.recipientId,
    },
  };

  try {
    return await tx.emailOutbox.upsert({ where, update: {}, create: input });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await tx.emailOutbox.findUnique({ where });
    if (existing) return existing;
    throw error;
  }
}

export const DOMAIN_EVENT_TYPES = {
  PAYMENT_SUCCEEDED: "payment.succeeded",
  PAID_PACKAGE_READY: "package.paid_ready",
  PACKAGE_STATUS_CHANGED: "package.status_changed",
  SHIPMENT_STATUS_CHANGED: "shipment.status_changed",
  SHIPMENT_DELIVERY_ATTEMPT: "shipment.delivery_attempt",
  SHIPMENT_TRACKING_UPDATED: "shipment.tracking_updated",
  RETURN_REQUESTED: "return.requested",
  RETURN_STATUS_CHANGED: "return.status_changed",
  RETURN_DEADLINE_DUE: "return.deadline_due",
  RETURN_DISPUTE_ESCALATED: "return.dispute_escalated",
  REFUND_ISSUED: "refund.issued",
  EXCHANGE_APPROVED: "exchange.approved",
  RETURN_INVENTORY_RECONCILED: "return.inventory_reconciled",
  CHECKOUT_ABANDONED: "checkout.abandoned",
  PAYOUT_BATCH_READY_FOR_REVIEW: "payout.batch_ready_for_review",
  PRODUCT_QUESTION_ASKED: "product.question_asked",
  PRODUCT_QUESTION_ANSWERED: "product.question_answered",
  INQUIRY_BUYER_SENT: "inquiry.buyer_sent",
  INQUIRY_SELLER_REPLIED: "inquiry.seller_replied",
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];

export type PublishDomainEventInput = {
  eventKey: string;
  eventType: DomainEventType;
  aggregateType:
    | "ORDER"
    | "ORDER_PACKAGE"
    | "SHIPMENT"
    | "RETURN_REQUEST"
    | "CART"
    | "PAYOUT_BATCH"
    | "PRODUCT"
    | "PRODUCT_QUESTION"
    | "CONVERSATION";
  aggregateId: string;
  actorUserId?: string | null;
  orderId?: string;
  storeId?: string;
  payload: Prisma.InputJsonObject;
  /** Persist the event now and defer recipient/notification fan-out until after commit. */
  persistEventOnly?: boolean;
};

type Recipient = {
  id: string;
  email: string;
  role: Role;
};

function payloadText(payload: Prisma.InputJsonObject, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function humanizeStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function resolveRecipients(
  tx: NotificationDbClient,
  input: PublishDomainEventInput,
): Promise<Recipient[]> {
  const recipientIds = new Set<string>();
  const recipientEmailOverrides = new Map<string, string>();

  if (
    input.orderId &&
    (input.eventType === DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED ||
      input.eventType === DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED ||
      input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED ||
      input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_DELIVERY_ATTEMPT ||
      input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_TRACKING_UPDATED ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_STATUS_CHANGED ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_DEADLINE_DUE ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_DISPUTE_ESCALATED ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_INVENTORY_RECONCILED ||
      input.eventType === DOMAIN_EVENT_TYPES.EXCHANGE_APPROVED ||
      input.eventType === DOMAIN_EVENT_TYPES.REFUND_ISSUED)
  ) {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: { userId: true },
    });
    if (order) recipientIds.add(order.userId);
  }

  if (input.eventType === DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED) {
    const cart = await tx.cart.findUnique({
      where: { id: input.aggregateId },
      select: { userId: true },
    });
    if (cart) recipientIds.add(cart.userId);
  }

  if (
    input.storeId &&
    (input.eventType === DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY ||
      input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED ||
      input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_DELIVERY_ATTEMPT ||
      input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_TRACKING_UPDATED ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_REQUESTED ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_DEADLINE_DUE ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_DISPUTE_ESCALATED ||
      input.eventType === DOMAIN_EVENT_TYPES.RETURN_INVENTORY_RECONCILED ||
      input.eventType === DOMAIN_EVENT_TYPES.EXCHANGE_APPROVED)
  ) {
    const store = await tx.store.findUnique({
      where: { id: input.storeId },
      select: { userId: true, email: true },
    });
    if (store) {
      recipientIds.add(store.userId);
      // Seller operational mail belongs at the store contact address. This also
      // shields delivery from stale legacy User.email values while Clerk remains
      // the source of truth for authentication.
      recipientEmailOverrides.set(store.userId, store.email);
    }
  }

  // A seller handoff transfers operational control to logistics. Notify every
  // platform admin so the warehouse/admin queue can continue the shipment.
  if (
    input.eventType === DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED &&
    payloadText(input.payload, "nextStatus") === "Handed off"
  ) {
    const admins = await tx.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });
    for (const admin of admins) recipientIds.add(admin.id);
  }
  if (
    input.eventType === DOMAIN_EVENT_TYPES.RETURN_DISPUTE_ESCALATED ||
    input.eventType === DOMAIN_EVENT_TYPES.RETURN_INVENTORY_RECONCILED
  ) {
    const admins = await tx.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });
    for (const admin of admins) recipientIds.add(admin.id);
  }
  if (input.eventType === DOMAIN_EVENT_TYPES.PAYOUT_BATCH_READY_FOR_REVIEW) {
    const admins = await tx.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });
    for (const admin of admins) recipientIds.add(admin.id);
  }

  if (
    input.eventType === DOMAIN_EVENT_TYPES.PRODUCT_QUESTION_ASKED &&
    input.storeId
  ) {
    const store = await tx.store.findUnique({
      where: { id: input.storeId },
      select: { userId: true, email: true },
    });
    if (store && store.userId !== input.actorUserId) {
      recipientIds.add(store.userId);
      recipientEmailOverrides.set(store.userId, store.email);
    }
  }

  if (input.eventType === DOMAIN_EVENT_TYPES.PRODUCT_QUESTION_ANSWERED) {
    const questionId = payloadText(input.payload, "questionId");
    if (questionId) {
      const question = await tx.productQuestion.findUnique({
        where: { id: questionId },
        select: { userId: true },
      });
      if (question && question.userId !== input.actorUserId) {
        recipientIds.add(question.userId);
      }
    }
  }

  if (input.eventType === DOMAIN_EVENT_TYPES.INQUIRY_BUYER_SENT) {
    const storeId = input.storeId ?? payloadText(input.payload, "storeId");
    if (storeId) {
      const store = await tx.store.findUnique({
        where: { id: storeId },
        select: { userId: true },
      });
      if (store && store.userId !== input.actorUserId) {
        recipientIds.add(store.userId);
      }
    }
  }

  if (input.eventType === DOMAIN_EVENT_TYPES.INQUIRY_SELLER_REPLIED) {
    const buyerId = payloadText(input.payload, "buyerId");
    if (buyerId && buyerId !== input.actorUserId) {
      recipientIds.add(buyerId);
    }
  }

  if (recipientIds.size === 0) return [];

  const users = await tx.user.findMany({
    where: { id: { in: [...recipientIds] } },
    select: { id: true, email: true, role: true },
  });
  return users.map((user) => ({
    ...user,
    email: recipientEmailOverrides.get(user.id) ?? user.email,
  }));
}

function hasDeliverableEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function notificationFor(input: PublishDomainEventInput, recipient: Recipient) {
  const orderId = input.orderId ?? payloadText(input.payload, "orderId");
  const orderGroupId =
    payloadText(input.payload, "orderGroupId") ||
    (input.aggregateType === "ORDER_PACKAGE" ? input.aggregateId : "");
  const storeUrl = payloadText(input.payload, "storeUrl");
  const nextStatus = payloadText(input.payload, "nextStatus");
  const orderReference = orderId ? formatOrderId(orderId) : "";
  const packageReference = orderGroupId ? formatPackageId(orderGroupId) : "";

  switch (input.eventType) {
    case DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED:
      return {
        category: NotificationCategory.PAYMENT,
        title: "Payment confirmed",
        message: "Your payment was successful and your order is confirmed.",
        actionUrl: orderId ? `/order/${orderId}` : null,
      };
    case DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY:
      return {
        category: NotificationCategory.ORDER,
        title: "New paid order",
        message: `${packageReference || "A package"}${orderReference ? ` in ${orderReference}` : ""} is paid and ready for preparation.`,
        actionUrl: storeUrl
          ? `/dashboard/seller/stores/${storeUrl}/orders`
          : null,
      };
    case DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED:
      if (recipient.role === Role.ADMIN) {
        return {
          category: NotificationCategory.FULFILLMENT,
          title: "Package ready for logistics",
          message: `${packageReference || "A package"}${orderReference ? ` in ${orderReference}` : ""} was handed off for warehouse processing.`,
          actionUrl: "/dashboard/admin/orders",
        };
      }
      return {
        category: NotificationCategory.FULFILLMENT,
        title: "Package preparation updated",
        message: `${packageReference || "Your package"} is now ${nextStatus || "being prepared"}.`,
        actionUrl: orderId ? `/order/${orderId}` : null,
      };
    case DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED:
      return recipient.role === Role.SELLER
        ? {
            category: NotificationCategory.DELIVERY,
            title: "Shipment status updated",
            message: `${packageReference || "A handed-off package"} is now ${nextStatus || "in transit"}.`,
            actionUrl: storeUrl
              ? `/dashboard/seller/stores/${storeUrl}/orders`
              : null,
          }
        : {
            category: NotificationCategory.DELIVERY,
            title: "Delivery progress updated",
            message: `${packageReference || "Your package"} is now ${nextStatus || "in transit"}.`,
            actionUrl: orderId ? `/order/${orderId}` : null,
          };
    case DOMAIN_EVENT_TYPES.SHIPMENT_DELIVERY_ATTEMPT:
      return {
        category: NotificationCategory.DELIVERY,
        title: "Delivery attempt recorded",
        message: `${packageReference || "Your shipment"} has a delivery attempt update: ${payloadText(input.payload, "outcome") || "recorded"}.`,
        actionUrl: orderId ? `/order/${orderId}` : null,
      };
    case DOMAIN_EVENT_TYPES.SHIPMENT_TRACKING_UPDATED:
      return {
        category: NotificationCategory.DELIVERY,
        title: "Tracking information updated",
        message: `${packageReference || "Your shipment"} has new carrier tracking information.`,
        actionUrl: orderId ? `/order/${orderId}` : null,
      };
    case DOMAIN_EVENT_TYPES.RETURN_REQUESTED:
      return {
        category: NotificationCategory.RETURN,
        title: "New return request",
        message: `A customer submitted a return request for ${packageReference || "a package"}${orderReference ? ` in ${orderReference}` : ""}.`,
        actionUrl: storeUrl
          ? `/dashboard/seller/stores/${storeUrl}/returns`
          : null,
      };
    case DOMAIN_EVENT_TYPES.RETURN_STATUS_CHANGED: {
      const statusLabel = humanizeStatus(nextStatus || "updated");
      return {
        category: NotificationCategory.RETURN,
        title: `Return request ${statusLabel}`,
        message: `${packageReference || "Your return request"} is now ${statusLabel}.`,
        actionUrl: payloadText(input.payload, "returnRequestId")
          ? `/profile/returns/${payloadText(input.payload, "returnRequestId")}`
          : null,
      };
    }
    case DOMAIN_EVENT_TYPES.RETURN_DEADLINE_DUE:
    case DOMAIN_EVENT_TYPES.RETURN_DISPUTE_ESCALATED:
    case DOMAIN_EVENT_TYPES.RETURN_INVENTORY_RECONCILED:
    case DOMAIN_EVENT_TYPES.EXCHANGE_APPROVED:
      return {
        category: NotificationCategory.RETURN,
        title: "Return workflow updated",
        message: `Your return request has a new ${humanizeStatus(input.eventType.split(".")[1] ?? "update")} update.`,
        actionUrl: payloadText(input.payload, "returnRequestId")
          ? `/profile/returns/${payloadText(input.payload, "returnRequestId")}`
          : null,
      };
    case DOMAIN_EVENT_TYPES.REFUND_ISSUED:
      return {
        category: NotificationCategory.REFUND,
        title: "Refund issued",
        message: "A refund has been issued for your order.",
        actionUrl: orderId ? `/order/${orderId}` : null,
      };
    case DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED:
      return {
        category: NotificationCategory.ORDER,
        title: "Your cart is waiting",
        message: "You still have saved items ready for checkout.",
        actionUrl: "/cart",
      };
    case DOMAIN_EVENT_TYPES.PAYOUT_BATCH_READY_FOR_REVIEW:
      return {
        category: NotificationCategory.SYSTEM,
        title: "Weekly payout batch needs review",
        message: `${payloadText(input.payload, "settlementCount") || "Eligible"} seller settlement(s) are ready for approval. Review the batch before any Stripe transfer is processed.`,
        actionUrl: `/dashboard/admin/settlements?batchId=${encodeURIComponent(payloadText(input.payload, "payoutBatchId"))}`,
      };
    case DOMAIN_EVENT_TYPES.PRODUCT_QUESTION_ASKED:
      return {
        category: NotificationCategory.SYSTEM,
        title: "New question on your product",
        message: `${payloadText(input.payload, "authorName") || "A customer"} asked a question about ${payloadText(input.payload, "productName") || "your product"}.`,
        actionUrl: `/product/${payloadText(input.payload, "productSlug")}#questions`,
      };
    case DOMAIN_EVENT_TYPES.PRODUCT_QUESTION_ANSWERED:
      return {
        category: NotificationCategory.SYSTEM,
        title: "Your question received an answer",
        message: `${payloadText(input.payload, "authorName") || "Someone"} answered your question about ${payloadText(input.payload, "productName") || "the product"}.`,
        actionUrl: `/product/${payloadText(input.payload, "productSlug")}#questions`,
      };
    case DOMAIN_EVENT_TYPES.INQUIRY_BUYER_SENT:
      return {
        category: NotificationCategory.SYSTEM,
        title: `New message from ${payloadText(input.payload, "buyerName") || "a customer"}`,
        message: payloadText(input.payload, "subject")
          ? `${payloadText(input.payload, "subject")}: "${payloadText(input.payload, "bodySnippet")}"`
          : `"${payloadText(input.payload, "bodySnippet")}"`,
        actionUrl: storeUrl
          ? `/dashboard/seller/stores/${storeUrl}/messages`
          : null,
      };
    case DOMAIN_EVENT_TYPES.INQUIRY_SELLER_REPLIED:
      return {
        category: NotificationCategory.SYSTEM,
        title: `Reply from ${payloadText(input.payload, "storeName") || "the store"}`,
        message: `"${payloadText(input.payload, "bodySnippet")}"`,
        actionUrl: "/profile/messages",
      };
  }
}

export async function publishPaidOrderNotifications(
  tx: NotificationDbClient,
  input: {
    orderId: string;
    provider: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
    paidAt: Date;
  },
) {
  const paidOrder = await tx.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      subTotal: true,
      shippingFees: true,
      total: true,
      groups: {
        select: {
          id: true,
          storeId: true,
          subTotal: true,
          shippingFees: true,
          total: true,
          coupon: { select: { code: true } },
          store: { select: { name: true, url: true } },
          items: {
            select: {
              name: true,
              image: true,
              sku: true,
              size: true,
              quantity: true,
              price: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });
  if (!paidOrder) throw new Error("Paid order could not be found.");
  const sourceEventIds: string[] = [];
  const originalSubtotal = paidOrder.groups.reduce(
    (total, orderPackage) => total + orderPackage.subTotal,
    0,
  );
  const shippingFees = paidOrder.groups.reduce(
    (total, orderPackage) => total + orderPackage.shippingFees,
    0,
  );
  const discountAmount = Math.max(
    0,
    originalSubtotal + shippingFees - input.amount,
  );
  const couponCode = [
    ...new Set(
      paidOrder.groups
        .map((orderPackage) => orderPackage.coupon?.code)
        .filter((code): code is string => Boolean(code)),
    ),
  ].join(", ");

  const paymentEvent = await publishDomainEvent(tx, {
    eventKey: `payment:succeeded:${input.provider}:${input.providerPaymentId}`,
    eventType: DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED,
    aggregateType: "ORDER",
    aggregateId: input.orderId,
    orderId: input.orderId,
    payload: {
      orderId: input.orderId,
      providerPaymentId: input.providerPaymentId,
      provider: input.provider,
      paymentMethod: input.provider,
      paymentReference: input.providerPaymentId,
      paidAt: input.paidAt.toISOString(),
      subTotal: originalSubtotal,
      shippingFees,
      discountAmount,
      couponCode,
      total: input.amount,
      currency: input.currency,
      itemCount: paidOrder.groups.reduce(
        (total, orderPackage) =>
          total +
          orderPackage.items.reduce((count, item) => count + item.quantity, 0),
        0,
      ),
      items: paidOrder.groups.flatMap((orderPackage) =>
        orderPackage.items.map((item) => ({
          name: item.name,
          image: item.image,
          sku: item.sku,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.totalPrice,
          storeName: orderPackage.store.name,
        })),
      ),
    },
  });
  sourceEventIds.push(paymentEvent.id);

  for (const orderPackage of paidOrder.groups) {
    if (demoFulfillmentAutomationEnabled()) {
      await tx.orderGroup.update({
        where: { id: orderPackage.id },
        data: {
          automationMode: "DEMO",
          nextTransitionAt: new Date(
            Date.now() + demoFulfillmentStepHours() * 60 * 60 * 1000,
          ),
        },
      });
    }
    const packageEvent = await publishDomainEvent(tx, {
      eventKey: `package:paid-ready:${input.provider}:${input.providerPaymentId}:${orderPackage.id}`,
      eventType: DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY,
      aggregateType: "ORDER_PACKAGE",
      aggregateId: orderPackage.id,
      orderId: input.orderId,
      storeId: orderPackage.storeId,
      payload: {
        orderId: input.orderId,
        orderGroupId: orderPackage.id,
        storeUrl: orderPackage.store.url,
        storeName: orderPackage.store.name,
        providerPaymentId: input.providerPaymentId,
        provider: input.provider,
        subTotal: orderPackage.subTotal,
        shippingFees: orderPackage.shippingFees,
        total: orderPackage.total,
        discountAmount: Math.max(
          0,
          orderPackage.subTotal +
            orderPackage.shippingFees -
            orderPackage.total,
        ),
        couponCode: orderPackage.coupon?.code ?? "",
        currency: input.currency,
        itemCount: orderPackage.items.reduce(
          (count, item) => count + item.quantity,
          0,
        ),
        items: orderPackage.items.map((item) => ({
          name: item.name,
          image: item.image,
          sku: item.sku,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.totalPrice,
          storeName: orderPackage.store.name,
        })),
        nextStatus: "Awaiting acceptance",
      },
    });
    sourceEventIds.push(packageEvent.id);
  }

  return sourceEventIds;
}

export async function publishDomainEvent(
  tx: NotificationDbClient,
  input: PublishDomainEventInput,
) {
  validateDomainEventPayload(input.eventType, input.payload);
  const eventData = {
    eventKey: input.eventKey,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    actorUserId: input.actorUserId ?? null,
    payload: input.payload,
  };
  let event;
  try {
    event = await tx.domainEvent.upsert({
      where: { eventKey: input.eventKey },
      update: {},
      create: eventData,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const concurrentEvent = await tx.domainEvent.findUnique({
      where: { eventKey: input.eventKey },
    });
    if (!concurrentEvent) throw error;
    event = concurrentEvent;
  }
  if (input.persistEventOnly) return event;

  const recipients = await resolveRecipients(tx, input);
  const preferenceRows = await tx.notificationPreference.findMany({
    where: { userId: { in: recipients.map((recipient) => recipient.id) } },
    select: { userId: true, category: true, channel: true, enabled: true },
  });
  const preferences = new Map(
    preferenceRows.map((row) => [
      `${row.userId}:${row.category}:${row.channel}`,
      row.enabled,
    ]),
  );
  for (const recipient of recipients) {
    const content = notificationFor(input, recipient);
    const inAppEnabled =
      preferences.get(
        `${recipient.id}:${content.category}:${NotificationChannel.IN_APP}`,
      ) ?? true;
    const emailEnabled =
      preferences.get(
        `${recipient.id}:${content.category}:${NotificationChannel.EMAIL}`,
      ) ?? true;
    if (inAppEnabled)
      await ensureNotification(tx, {
        sourceEventId: event.id,
        recipientId: recipient.id,
        eventType: input.eventType,
        ...content,
      });
    await ensureDeliveryAudit(tx, {
      sourceEventId: event.id,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      channel: NotificationChannel.IN_APP,
      status: inAppEnabled ? "QUEUED" : "SKIPPED",
      finishedAt: inAppEnabled ? null : new Date(),
    });
    if (!emailEnabled || !hasDeliverableEmail(recipient.email)) {
      await ensureDeliveryAudit(tx, {
        sourceEventId: event.id,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        channel: NotificationChannel.EMAIL,
        status: "SKIPPED",
        finishedAt: new Date(),
      });
      continue;
    }
    await ensureEmailOutbox(tx, {
      sourceEventId: event.id,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      templateKey: input.eventType,
      payload: {
        ...input.payload,
        title: content.title,
        message: content.message,
        actionUrl: content.actionUrl,
      },
    });
    await ensureDeliveryAudit(tx, {
      sourceEventId: event.id,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      channel: NotificationChannel.EMAIL,
      status: "QUEUED",
    });
  }

  return event;
}
