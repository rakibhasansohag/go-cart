import { createHash } from "node:crypto";
import {
  PrismaClient,
  FulfillmentMode,
  OrderStatus,
  PackageStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ShipmentStatus,
  Role,
  ShippingFeeMethod,
  StoreStatus,
} from "@prisma/client";
import { assertSafeE2ERuntime } from "../src/lib/runtime-safety";

/**
 * Deterministic, scoped demo fixture generator.
 *
 * It recreates only records in the `gocart-demo-*` namespace, so rerunning the
 * command is safe and changing the builders below is enough to add future
 * fields. It never deletes user-created records.
 */
assertSafeE2ERuntime();
const db = new PrismaClient();
const COUNT = Math.max(
  1,
  Math.min(10_000, Number(process.env.DEMO_SEED_COUNT ?? 1_000)),
);
const PREFIX = "gocart-demo";

function id(kind: string, index: number) {
  const hex = createHash("sha256")
    .update(`${PREFIX}:${kind}:${index}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function dateFor(index: number) {
  return new Date(Date.now() - (index % 180) * 24 * 60 * 60 * 1000);
}

const users = {
  admin: process.env.E2E_ADMIN_EMAIL ?? "rakibhasansohag133@gmail.com",
  seller: process.env.E2E_SELLER_EMAIL ?? "drdevil133@gmail.com",
  customer: process.env.E2E_CUSTOMER_EMAIL ?? "rakibdev133@gmail.com",
} as const;

const statusFixtures = [
  {
    order: OrderStatus.Pending,
    item: ProductStatus.Pending,
    package: PackageStatus.PENDING,
    shipment: ShipmentStatus.AWAITING_RECEIPT,
  },
  {
    order: OrderStatus.Confirmed,
    item: ProductStatus.ReadyForShipment,
    package: PackageStatus.ACCEPTED,
    shipment: ShipmentStatus.AWAITING_RECEIPT,
  },
  {
    order: OrderStatus.Processing,
    item: ProductStatus.Processing,
    package: PackageStatus.PROCESSING,
    shipment: ShipmentStatus.AWAITING_RECEIPT,
  },
  {
    order: OrderStatus.Processing,
    item: ProductStatus.Processing,
    package: PackageStatus.READY_FOR_HANDOFF,
    shipment: ShipmentStatus.AWAITING_RECEIPT,
  },
  {
    order: OrderStatus.Processing,
    item: ProductStatus.Shipped,
    package: PackageStatus.HANDED_OFF,
    shipment: ShipmentStatus.RECEIVED_AT_HUB,
  },
  {
    order: OrderStatus.Delivered,
    item: ProductStatus.Delivered,
    package: PackageStatus.HANDED_OFF,
    shipment: ShipmentStatus.DELIVERED,
  },
] as const;

const demoProductNames = [
  "Atlas Chronograph Watch",
  "Harbor Knit Cotton Sweater",
  "Aster Ceramic Travel Mug",
  "Northstar Wireless Headphones",
  "Cedar & Stone Leather Wallet",
  "Lumen 27-inch Monitor",
  "Cloudline Everyday Sneakers",
  "Ridgeway Canvas Backpack",
  "Solace Linen Throw Blanket",
  "Field Notes Hardcover Journal",
  "Mistral Stainless Water Bottle",
  "Cove Minimal Desk Lamp",
  "Juniper Botanical Candle",
  "Summit Insulated Jacket",
  "Willow Woven Crossbody Bag",
  "Ember Portable Bluetooth Speaker",
  "Meadow Relaxed Fit T-shirt",
  "Orbit Mechanical Keyboard",
  "Pinecrest Trail Running Shoes",
  "Sable Wood Serving Board",
  "Drift Ceramic Planter",
  "Verde Everyday Sunglasses",
  "Beacon USB-C Charging Hub",
  "Horizon Cotton Bath Towel",
  "Vale Softshell Travel Jacket",
] as const;

async function main() {
  const [admin, seller, customer] = await Promise.all([
    db.user.upsert({
      where: { email: users.admin },
      update: { name: "Rakib Hasan Sohag", role: Role.ADMIN },
      create: {
        name: "Rakib Hasan Sohag",
        email: users.admin,
        role: Role.ADMIN,
        picture: "https://i.pravatar.cc/160?img=12",
      },
    }),
    db.user.upsert({
      where: { email: users.seller },
      update: { name: "Demo Seller", role: Role.SELLER },
      create: {
        name: "Demo Seller",
        email: users.seller,
        role: Role.SELLER,
        picture: "https://i.pravatar.cc/160?img=33",
      },
    }),
    db.user.upsert({
      where: { email: users.customer },
      update: { name: "Demo Customer", role: Role.USER },
      create: {
        name: "Demo Customer",
        email: users.customer,
        role: Role.USER,
        picture: "https://i.pravatar.cc/160?img=5",
      },
    }),
  ]);
  // The seed only runs behind assertSafeE2ERuntime(). Keep marketplace tests
  // independent by restoring the documented default policy on every fixture
  // rebuild; production settings are never touched by this script.
  await db.platformSetting.upsert({
    where: { id: "default" },
    update: { commissionPercent: 2, payoutHoldDays: 7, updatedById: admin.id },
    create: {
      id: "default",
      commissionPercent: 2,
      payoutHoldDays: 7,
      updatedById: admin.id,
    },
  });
  const country = await db.country.upsert({
    where: { code: "US" },
    update: {},
    create: { name: "United States", code: "US" },
  });
  const store = await db.store.upsert({
    where: { url: "gocart-demo-store" },
    update: {
      userId: seller.id,
      name: "GoCart Demo Store",
      description: "Deterministic store used for local testing.",
      email: users.seller.replace("@", "+demo@"),
      phone: "+15550001000",
      logo: "https://picsum.photos/seed/gocart-demo-logo/200/200",
      cover: "https://picsum.photos/seed/gocart-demo-cover/1200/400",
      status: StoreStatus.ACTIVE,
    },
    create: {
      userId: seller.id,
      name: "GoCart Demo Store",
      description: "Deterministic store used for local testing.",
      email: users.seller.replace("@", "+demo@"),
      phone: "+15550001000",
      url: "gocart-demo-store",
      logo: "https://picsum.photos/seed/gocart-demo-logo/200/200",
      cover: "https://picsum.photos/seed/gocart-demo-cover/1200/400",
      status: StoreStatus.ACTIVE,
    },
  });
  const category = await db.category.upsert({
    where: { url: "gocart-demo-category" },
    update: {},
    create: {
      name: "Demo Catalog",
      image: "https://picsum.photos/seed/gocart-demo-category/600/400",
      url: "gocart-demo-category",
      featured: true,
    },
  });
  const subCategory = await db.subCategory.upsert({
    where: { url: "gocart-demo-subcategory" },
    update: {},
    create: {
      name: "Demo Products",
      image: "https://picsum.photos/seed/gocart-demo-subcategory/600/400",
      url: "gocart-demo-subcategory",
      categoryId: category.id,
      featured: true,
    },
  });

  const catalog = [] as Array<{
    productId: string;
    variantId: string;
    sizeId: string;
    name: string;
    slug: string;
    variantSlug: string;
    sku: string;
    image: string;
    size: string;
    price: number;
  }>;
  for (let index = 0; index < 25; index += 1) {
    const productId = id("product", index);
    const variantId = id("variant", index);
    const sizeId = id("size", index);
    const slug = `gocart-demo-product-${index + 1}`;
    const variantSlug = `${slug}-standard`;
    const sku = `DEMO-${String(index + 1).padStart(4, "0")}`;
    const price = 25 + (index % 10) * 17.5;
    const name = demoProductNames[index % demoProductNames.length];
    const image = `https://picsum.photos/seed/gocart-demo-product-${index}-front/640/640`;
    const imageUrls = [
      image,
      `https://picsum.photos/seed/gocart-demo-product-${index}-detail/640/640`,
      `https://picsum.photos/seed/gocart-demo-product-${index}-lifestyle/640/640`,
    ];
    await db.product.upsert({
      where: { id: productId },
      update: {
        name,
        description: `A practical ${name.toLowerCase()} selected for the GoCart demo catalog.`,
      },
      create: {
        id: productId,
        name,
        description: `A practical ${name.toLowerCase()} selected for the GoCart demo catalog.`,
        slug,
        brand: "GoCart Demo",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        storeId: store.id,
        categoryId: category.id,
        subCategoryId: subCategory.id,
      },
    });
    await db.productVariant.upsert({
      where: { id: variantId },
      update: { variantName: "Standard", variantImage: image },
      create: {
        id: variantId,
        variantName: "Standard",
        variantDescription: `Standard ${name.toLowerCase()} variant`,
        variantImage: image,
        slug: variantSlug,
        sku,
        keywords: "demo,fixture,test",
        weight: 1,
        productId,
      },
    });
    await db.productVariantImage.deleteMany({
      where: { productVariantId: variantId },
    });
    await db.productVariantImage.createMany({
      data: imageUrls.map((url, order) => ({
        id: id(`variant-image-${order}`, index),
        url,
        alt: `${name} — view ${order + 1}`,
        order,
        productVariantId: variantId,
      })),
    });
    await db.size.upsert({
      where: { id: sizeId },
      update: { quantity: 100, price, discount: 0 },
      create: {
        id: sizeId,
        size: "Standard",
        quantity: 100,
        price,
        productVariantId: variantId,
      },
    });
    catalog.push({
      productId,
      variantId,
      sizeId,
      name,
      slug,
      variantSlug,
      sku,
      image,
      size: "Standard",
      price,
    });
  }

  const orderIds = Array.from({ length: COUNT }, (_, index) =>
    id("order", index),
  );
  const groupIds = Array.from({ length: COUNT }, (_, index) =>
    id("group", index),
  );
  const itemIds = Array.from({ length: COUNT }, (_, index) =>
    id("item", index),
  );
  const addressIds = Array.from({ length: COUNT }, (_, index) =>
    id("address", index),
  );
  const paymentIds = Array.from({ length: COUNT }, (_, index) =>
    id("payment", index),
  );
  await db.shipmentItem.deleteMany({ where: { orderItemId: { in: itemIds } } });
  await db.shipment.deleteMany({
    where: { packageAssignments: { some: { orderGroupId: { in: groupIds } } } },
  });
  // Browser mutation tests can create return requests for deterministic demo
  // orders. Remove those parent records first so their cascading ReturnItem,
  // ReturnEvent, evidence, and refund records release the order-item FKs.
  await db.returnRequest.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderItem.deleteMany({ where: { id: { in: itemIds } } });
  await db.paymentDetails.deleteMany({ where: { id: { in: paymentIds } } });
  await db.orderGroup.deleteMany({ where: { id: { in: groupIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });

  const orders = [];
  const addresses = [];
  const groups = [];
  const items = [];
  const payments = [];
  const shipments = [];
  const shipmentAssignments = [];
  const shipmentItems = [];
  const trackingEvents = [];
  const deliveryAttempts = [];
  for (let index = 0; index < COUNT; index += 1) {
    const fixture = statusFixtures[index % statusFixtures.length];
    const product = catalog[index % catalog.length];
    const quantity = (index % 3) + 1;
    const subtotal = product.price * quantity;
    const addressId = addressIds[index];
    const createdAt = dateFor(index);
    addresses.push({
      id: addressId,
      firstName: "Demo",
      lastName: `Customer ${index + 1}`,
      phone: "+15550001001",
      address1: `${index + 1} Demo Street`,
      address2: null,
      state: "CA",
      city: "San Francisco",
      zip_code: "94105",
      default: index === 0,
      userId: customer.id,
      countryId: country.id,
      createdAt,
      updatedAt: createdAt,
    });
    orders.push({
      id: orderIds[index],
      shippingFees: 0,
      subTotal: subtotal,
      total: subtotal,
      orderStatus: fixture.order,
      paymentStatus: PaymentStatus.Paid,
      paymentMethod: PaymentMethod.Stripe,
      shippingAddressId: addressId,
      userId: customer.id,
      createdAt,
      updatedAt: createdAt,
    });
    groups.push({
      id: groupIds[index],
      status: fixture.order,
      fulfillmentMode: FulfillmentMode.PLATFORM,
      packageStatus: fixture.package,
      shippingService: "Demo Delivery",
      shippingDeliveryMin: 3,
      shippingDeliveryMax: 10,
      shippingFees: 0,
      subTotal: subtotal,
      total: subtotal,
      orderId: orderIds[index],
      storeId: store.id,
      createdAt,
      updatedAt: createdAt,
    });
    items.push({
      id: itemIds[index],
      productId: product.productId,
      variantId: product.variantId,
      sizeId: product.sizeId,
      productSlug: product.slug,
      variantSlug: product.variantSlug,
      sku: product.sku,
      name: product.name,
      image: product.image,
      size: product.size,
      quantity,
      shippingFee: 0,
      price: product.price,
      totalPrice: subtotal,
      orderGroupId: groupIds[index],
      status: fixture.item,
      deliveredAt: fixture.item === ProductStatus.Delivered ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    });
    payments.push({
      id: paymentIds[index],
      paymentInetntId: `demo_pi_${index + 1}`,
      paymentMethod: "Stripe",
      status: "succeeded",
      amount: subtotal,
      currency: "USD",
      orderId: orderIds[index],
      userId: customer.id,
      createdAt,
      updatedAt: createdAt,
    });
    const shipmentId = id("shipment", index);
    const isConsolidatedPackage = index === 4;
    if (!isConsolidatedPackage) {
      shipments.push({
        id: shipmentId,
        status: fixture.shipment,
        carrier: index % 3 === 0 ? "DemoShip" : null,
        trackingNumber:
          index % 3 === 0
            ? `DEMO-TRACK-${String(index + 1).padStart(4, "0")}`
            : null,
        serviceLevel: index % 3 === 0 ? "Demo Express" : null,
        estimatedDeliveryAt:
          index % 3 === 0
            ? new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000)
            : null,
        proofOfDeliveryUrl:
          fixture.shipment === ShipmentStatus.DELIVERED
            ? `https://example.test/proof/${shipmentId}`
            : null,
        proofOfDeliveryAt:
          fixture.shipment === ShipmentStatus.DELIVERED ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
      });
      shipmentAssignments.push({
        id: id("shipment-assignment", index),
        shipmentId,
        orderGroupId: groupIds[index],
        createdAt,
        updatedAt: createdAt,
      });
      // Demo order 3 is deliberately split across two shipments.
      const splitQuantity = index === 2 ? Math.max(1, quantity - 1) : quantity;
      shipmentItems.push({
        id: id("shipment-item", index),
        shipmentId,
        orderItemId: itemIds[index],
        quantity: splitQuantity,
        createdAt,
        updatedAt: createdAt,
      });
      if (index === 2) {
        const splitShipmentId = id("shipment-split", index);
        shipments.push({
          id: splitShipmentId,
          status: ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
          carrier: "DemoShip",
          trackingNumber: "DEMO-SPLIT-0003",
          serviceLevel: "Demo Ground",
          estimatedDeliveryAt: new Date(
            createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
          ),
          proofOfDeliveryUrl: null,
          proofOfDeliveryAt: null,
          createdAt,
          updatedAt: createdAt,
        });
        shipmentAssignments.push({
          id: id("shipment-assignment-split", index),
          shipmentId: splitShipmentId,
          orderGroupId: groupIds[index],
          createdAt,
          updatedAt: createdAt,
        });
        shipmentItems.push({
          id: id("shipment-item-split", index),
          shipmentId: splitShipmentId,
          orderItemId: itemIds[index],
          quantity: 1,
          createdAt,
          updatedAt: createdAt,
        });
        trackingEvents.push({
          id: id("tracking-split-hub", index),
          providerEventId: `demo-carrier-${index}-hub`,
          shipmentId: splitShipmentId,
          status: ShipmentStatus.RECEIVED_AT_HUB,
          location: "Demo Hub",
          description: "Split parcel received at the regional hub.",
          occurredAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
          createdAt,
        });
        trackingEvents.push({
          id: id("tracking-split-failed", index),
          providerEventId: `demo-carrier-${index}-failed`,
          shipmentId: splitShipmentId,
          status: ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
          location: "Demo City",
          description:
            "Recipient was unavailable; another attempt is scheduled.",
          occurredAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
          createdAt,
        });
        deliveryAttempts.push({
          id: id("delivery-attempt", index),
          shipmentId: splitShipmentId,
          attemptNumber: 1,
          outcome: "FAILED",
          reasonCode: "CUSTOMER_UNAVAILABLE",
          message: "Recipient was unavailable at the delivery address.",
          occurredAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        });
      }
      if (index === 0) {
        trackingEvents.push({
          id: id("tracking-accepted", index),
          providerEventId: `demo-carrier-${index}-accepted`,
          shipmentId,
          status: ShipmentStatus.AWAITING_RECEIPT,
          location: "Demo Warehouse",
          description: "Shipment label created and awaiting carrier receipt.",
          occurredAt: createdAt,
          createdAt,
        });
      }
      if (index === 3) {
        trackingEvents.push({
          id: id("tracking-consolidated", index),
          providerEventId: `demo-carrier-${index}-hub`,
          shipmentId,
          status: ShipmentStatus.RECEIVED_AT_HUB,
          location: "Demo Consolidation Hub",
          description:
            "Two seller packages were consolidated for line-haul transport.",
          occurredAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
          createdAt,
        });
      }
    } else {
      // Order 5 shares order 4's shipment to exercise a consolidated package.
      shipmentAssignments.push({
        id: id("shipment-assignment-consolidated", index),
        shipmentId: id("shipment", 3),
        orderGroupId: groupIds[index],
        createdAt,
        updatedAt: createdAt,
      });
      shipmentItems.push({
        id: id("shipment-item-consolidated", index),
        shipmentId: id("shipment", 3),
        orderItemId: itemIds[index],
        quantity,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  // Keep deterministic addresses that may still be referenced by historical
  // orders. This makes reseeding safe on a branched production snapshot.
  await db.shippingAddress.createMany({
    data: addresses,
    skipDuplicates: true,
  });
  await db.order.createMany({ data: orders });
  await db.orderGroup.createMany({ data: groups });
  await db.orderItem.createMany({ data: items });
  await db.paymentDetails.createMany({ data: payments });
  await db.shipment.createMany({ data: shipments });
  await db.shipmentPackageAssignment.createMany({ data: shipmentAssignments });
  await db.shipmentItem.createMany({ data: shipmentItems });
  await db.trackingEvent.createMany({ data: trackingEvents });
  await db.deliveryAttempt.createMany({ data: deliveryAttempts });
  console.log(
    `Seeded ${COUNT} deterministic demo orders for ${users.customer}. Seller: ${users.seller}. Admin: ${users.admin}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
