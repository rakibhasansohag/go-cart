import { createHash } from 'node:crypto';
import { PrismaClient, ReturnReason, ReturnRequestStatus, ReturnResolution } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';

assertSafeE2ERuntime();

const db = new PrismaClient();

function demoFixtureId(kind: string, index: number) {
	const hex = createHash('sha256').update(`gocart-demo:${kind}:${index}`).digest('hex').slice(0, 32);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
	const customerEmail = process.env.E2E_CUSTOMER_EMAIL;
	if (!customerEmail) throw new Error('E2E_CUSTOMER_EMAIL is required for commerce fixtures.');
	const sellerEmail = process.env.E2E_SELLER_EMAIL;
	if (!sellerEmail) throw new Error('E2E_SELLER_EMAIL is required for commerce fixtures.');

	const customer = await db.user.findUnique({ where: { email: customerEmail } });
	if (!customer) throw new Error(`Commerce fixture customer was not found: ${customerEmail}`);
	const seller = await db.user.findUnique({ where: { email: sellerEmail } });
	if (!seller || seller.role !== 'SELLER') throw new Error(`Commerce fixture seller was not found: ${sellerEmail}`);

	const product = await db.product.findUnique({
		where: { slug: 'gocart-demo-product-1' },
		include: { variants: { include: { sizes: true, images: true } } },
	});
	const variant = product?.variants[0];
	const size = variant?.sizes[0];
	const image = variant?.images[0];
	if (!product || !variant || !size || !image) {
		throw new Error('The deterministic demo catalog is missing gocart-demo-product-1.');
	}
	await db.store.update({ where: { id: product.storeId }, data: { userId: seller.id } });

	let address = await db.shippingAddress.findFirst({
		where: { userId: customer.id },
		orderBy: [{ default: 'desc' }, { createdAt: 'asc' }],
	});
	if (!address) {
		const country = await db.country.findUnique({ where: { code: 'US' } });
		if (!country) throw new Error('The deterministic US country fixture is missing.');
		address = await db.shippingAddress.create({
			data: {
				firstName: 'E2E',
				lastName: 'Customer',
				phone: '+15550001001',
				address1: '1 E2E Test Street',
				state: 'CA',
				city: 'San Francisco',
				zip_code: '94105',
				default: true,
				userId: customer.id,
				countryId: country.id,
			},
		});
	}

	// The isolated E2E profile owns this cart. Recreate it so every browser run
	// starts from the same known product and quantity.
	await db.cart.deleteMany({ where: { userId: customer.id } });
	const total = size.price * 1;
	const cart = await db.cart.create({
		data: {
			userId: customer.id,
			subTotal: total,
			shippingFees: 0,
			total,
			cartItems: {
				create: {
					productId: product.id,
					variantId: variant.id,
					sizeId: size.id,
					productSlug: product.slug,
					variantSlug: variant.slug,
					sku: variant.sku,
					name: `${product.name} · ${variant.variantName}`,
					image: image.url,
					size: size.size,
					price: size.price,
					quantity: 1,
					shippingFee: 0,
					totalPrice: total,
					storeId: product.storeId,
				},
			},
		},
	});

	const returnItem = await db.orderItem.findUnique({
		where: { id: demoFixtureId('item', 5) },
		include: { orderGroup: { include: { order: { include: { paymentDetails: true } } } } },
	});
	if (!returnItem || returnItem.status !== 'Delivered') {
		throw new Error('The deterministic delivered return fixture is missing.');
	}

	const returnRequestId = demoFixtureId('return', 5);
	await db.returnRequest.deleteMany({ where: { id: returnRequestId } });
	await db.returnRequest.create({
		data: {
			id: returnRequestId,
			status: ReturnRequestStatus.REQUESTED,
			reason: ReturnReason.DAMAGED,
			resolution: ReturnResolution.REFUND,
			customerNote: 'Deterministic E2E return workflow fixture.',
			requestedAmount: returnItem.price,
			requestedSubtotal: returnItem.price,
			requestedShipping: 0,
			requestedDiscount: 0,
			requestedTax: 0,
			currency: 'USD',
			customerId: customer.id,
			orderId: returnItem.orderGroup.orderId,
			orderGroupId: returnItem.orderGroupId,
			storeId: product.storeId,
			paymentDetailsId: returnItem.orderGroup.order.paymentDetails?.id,
			items: {
				create: {
					id: demoFixtureId('return-item', 5),
					quantity: 1,
					unitAmount: returnItem.price,
					requestedAmount: returnItem.price,
					shippingAmount: 0,
					discountAmount: 0,
					taxAmount: 0,
					orderItemId: returnItem.id,
					activeRequestKey: `e2e-return:${returnItem.id}`,
				},
			},
			events: {
				create: {
					actorRole: 'CUSTOMER',
					eventType: 'return.requested',
					toStatus: ReturnRequestStatus.REQUESTED,
					actorId: customer.id,
				},
			},
		},
	});

	console.log(`Seeded E2E commerce cart ${cart.id} for ${customerEmail}.`);
	console.log(`Seeded E2E return workflow: ${returnRequestId} for deterministic delivered item index 5.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
