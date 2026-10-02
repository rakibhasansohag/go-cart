import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { getProducts } from '../src/queries/product';

assertSafeE2ERuntime();
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/gocart_e2e') {
  throw new Error('Portfolio regression fixtures require local gocart_e2e.');
}

const db = new PrismaClient();
function fixtureId(kind: string, index: number): string {
  const hash = createHash('sha256').update(`portfolio-regression:${kind}:${index}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

try {
  const owner = await db.store.findUniqueOrThrow({ where: { url: 'gocart-demo-store' }, select: { userId: true } });
  const category = await db.category.findUniqueOrThrow({ where: { url: 'gocart-demo-category' } });
  const subCategory = await db.subCategory.findUniqueOrThrow({ where: { url: 'gocart-demo-subcategory' } });
  await db.$transaction(async (tx) => {
    const offer = await tx.offerTag.upsert({
      where: { url: 'portfolio-regression-offer' }, update: {},
      create: { name: 'Portfolio regression offer', url: 'portfolio-regression-offer' },
    });
    for (const [kind, count] of [['pagination', 50], ['empty', 0], ['single', 1]] as const) {
      const url = `portfolio-${kind}-store`;
      const data = {
        name: `Portfolio ${kind} fixture`, description: 'Isolated persistent browser regression fixture.',
        email: `${url}@example.test`, phone: '+15550009900', userId: owner.userId,
        logo: '/goCart.svg', cover: '/goCart.svg', status: 'ACTIVE' as const,
      };
      const store = await tx.store.upsert({ where: { url }, update: data, create: { ...data, url } });
      for (let index = 0; index < count; index++) {
        const id = fixtureId(`product-${kind}`, index);
        const product = {
          name: `PortfolioPagination item ${String(index + 1).padStart(2, '0')}`,
          description: 'Persistent search and discounted-price pagination fixture.',
          brand: 'Portfolio Fixture', slug: `portfolio-${kind}-product-${index + 1}`,
          views: 100 - index, rating: 4, storeId: store.id,
          categoryId: category.id, subCategoryId: subCategory.id,
          offerTagId: index % 2 === 0 ? offer.id : null,
        };
        await tx.product.upsert({ where: { id }, update: product, create: { id, ...product } });
        const variantId = fixtureId(`variant-${kind}`, index);
        const variant = {
          productId: id, variantName: 'Standard', variantDescription: 'PortfolioPagination',
          variantImage: '/goCart.svg', slug: `portfolio-${kind}-variant-${index + 1}`,
          sku: `PORTFOLIO-${kind}-${index + 1}`, keywords: 'PortfolioPagination', weight: 1,
        };
        await tx.productVariant.upsert({ where: { id: variantId }, update: variant, create: { id: variantId, ...variant } });
        const colorId = fixtureId(`color-${kind}`, index);
        const color = { productVariantId: variantId, name: index % 2 === 0 ? '#000000' : '#dc143c' };
        await tx.color.upsert({ where: { id: colorId }, update: color, create: { id: colorId, ...color } });
        const sizeId = fixtureId(`size-${kind}`, index);
        const size = { productVariantId: variantId, size: 'Standard', quantity: 100, price: 10 + index, discount: index % 3 === 0 ? 10 : 0 };
        await tx.size.upsert({ where: { id: sizeId }, update: size, create: { id: sizeId, ...size } });
        const imageId = fixtureId(`image-${kind}`, index);
        const image = { productVariantId: variantId, url: '/goCart.svg', order: 0, alt: product.name };
        await tx.productVariantImage.upsert({ where: { id: imageId }, update: image, create: { id: imageId, ...image } });
      }
    }
  }, { timeout: 30_000 });

  for (const sort of ['', 'price-low-to-high', 'price-high-to-low']) {
    const pages = await Promise.all([1, 2, 3].map((page) => getProducts({ store: 'portfolio-pagination-store', search: 'PortfolioPagination', page }, sort, null, 24)));
    const products = pages.flatMap((page) => page.products);
    if (pages.some((page) => page.totalCount !== 50) || pages.map((page) => page.products.length).join(',') !== '24,24,2' || new Set(products.map((product) => product.id)).size !== 50) {
      throw new Error('Persistent pagination fixture verification failed.');
    }
    if (sort) {
      const prices = products.map((product) => Math.min(...product.variants.flatMap((variant) => variant.sizes.map((size) => size.price * (1 - size.discount / 100)))));
      if (prices.some((price, index) => index > 0 && (sort === 'price-low-to-high' ? price < prices[index - 1] : price > prices[index - 1]))) {
        throw new Error('Persistent discounted-price order verification failed.');
      }
    }
  }
  const empty = await getProducts({ store: 'portfolio-empty-store' });
  const single = await getProducts({ store: 'portfolio-single-store' });
  if (empty.totalCount !== 0 || single.totalCount !== 1) throw new Error('Boundary store fixtures failed.');
  console.log('Persistent portfolio fixtures ready: search pages 24/24/2, both price directions, empty store and single-product store.');
} finally {
  await db.$disconnect();
}
