import { PrismaClient } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';

assertSafeE2ERuntime();

const db = new PrismaClient();

async function main() {
	const customerEmail = process.env.E2E_CUSTOMER_EMAIL;
	if (!customerEmail) throw new Error('E2E_CUSTOMER_EMAIL is required for commerce fixtures.');

	const customer = await db.user.findUnique({ where: { email: customerEmail } });
	if (!customer) throw new Error(`Commerce fixture customer was not found: ${customerEmail}`);

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

	console.log(`Seeded E2E commerce cart ${cart.id} for ${customerEmail}.`);
	console.log(`E2E return fixture item: deterministic demo order item index 5.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
