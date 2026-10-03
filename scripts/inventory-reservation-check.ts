import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { reserveCheckoutInventory } from '../src/lib/inventory/checkout';

const target = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1'].includes(target.hostname) && target.pathname === '/gocart_e2e', 'This check only permits the isolated local E2E database.');
const ids: string[] = [];
try {
	const variant = await db.productVariant.findFirst({ select: { id: true } });
	assert(variant, 'Seed the local catalog before running this check.');
	const a = await db.size.create({ data: { productVariantId: variant.id, size: 'Inventory race A', price: 1, quantity: 1 } });
	const b = await db.size.create({ data: { productVariantId: variant.id, size: 'Inventory race B', price: 1, quantity: 0 } });
	ids.push(a.id, b.id);
	const [first, last] = [a, b].sort((left, right) => left.id.localeCompare(right.id));
	await db.size.update({ where: { id: first.id }, data: { quantity: 1 } });
	await db.size.update({ where: { id: last.id }, data: { quantity: 0 } });
	await assert.rejects(db.$transaction(tx => reserveCheckoutInventory(tx, [{ sizeId: first.id, quantity: 1 }, { sizeId: last.id, quantity: 1 }])), /requested quantity/);
	assert.equal((await db.size.findUniqueOrThrow({ where: { id: first.id } })).quantity, 1, 'A shortage must roll back earlier reservations.');
	const results = await Promise.allSettled(Array.from({ length: 2 }, () => db.$transaction(tx => reserveCheckoutInventory(tx, [{ sizeId: first.id, quantity: 1 }]))));
	assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one checkout may reserve the last unit.');
	assert.equal((await db.size.findUniqueOrThrow({ where: { id: first.id } })).quantity, 0);
	console.log('PASS: real PostgreSQL last-unit race admits one checkout; shortage rolls back reservations.');
} finally {
	await db.size.deleteMany({ where: { id: { in: ids } } });
	await db.$disconnect();
}
