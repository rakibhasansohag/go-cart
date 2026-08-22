import { expect, test } from '@playwright/test';
import { demoFixtureId, demoPackageReference, signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true' || process.env.E2E_COMMERCE !== 'true',
  'Protected commerce E2E is opt-in and requires an isolated staging/test environment.',
);

test.describe('deterministic delivery journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('seller advances the demo package through handoff with keyboard-accessible controls', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/orders', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const sellerSearch = page.getByPlaceholder(/Search order, package, customer, product or SKU/i);
  await sellerSearch.fill(demoPackageReference(0));
  const sellerRow = page.getByRole('row').filter({ hasText: demoPackageReference(0) });

  for (const [current, next] of [
    ['Pending', 'Accepted'],
    ['Accepted', 'Processing'],
    ['Processing', 'Ready for handoff'],
    ['Ready for handoff', 'Handed off'],
  ] as const) {
    const statusSelect = sellerRow.getByRole('combobox', { name: new RegExp(`Change package status\\. Current status: ${current}`, 'i') });
    await expect(statusSelect).toBeVisible({ timeout: 30_000 });
    await statusSelect.focus();
    await statusSelect.press('Enter');
    const option = page.getByRole('option', { name: next, exact: true });
    await expect(option).toBeVisible();
    await expect(option).toBeEnabled();
    await option.press('Enter');
    if (next === 'Handed off') {
      await expect(sellerRow.getByLabel('Package preparation complete: Handed off')).toBeVisible({ timeout: 30_000 });
    } else {
      await expect(sellerRow.getByRole('combobox', { name: new RegExp(`Change package status\\. Current status: ${next}`, 'i') })).toBeVisible({ timeout: 30_000 });
    }
  }

    await testInfo.attach('seller-handoff-result.json', {
      body: JSON.stringify({ packageReference: demoPackageReference(0), finalPackageStatus: 'HANDED_OFF' }, null, 2),
      contentType: 'application/json',
    });
  });

  test('admin advances the handed-off shipment through delivery with keyboard-accessible controls', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/orders', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const search = page.getByPlaceholder(/Search order, package, store, seller, customer, product or SKU/i);
  await search.fill(demoPackageReference(0));
  const adminRow = page.getByRole('row').filter({ hasText: demoPackageReference(0) });
  await expect(adminRow).toBeVisible({ timeout: 30_000 });

  for (const [current, next] of [
    ['Awaiting receipt', 'Received at hub'],
    ['Received at hub', 'Ready for dispatch'],
    ['Ready for dispatch', 'In transit'],
    ['In transit', 'Out for delivery'],
    ['Out for delivery', 'Delivered'],
  ] as const) {
    const statusSelect = adminRow.getByRole('combobox', { name: new RegExp(`Change shipment status\\. Current status: ${current}`, 'i') });
    await expect(statusSelect).toBeVisible({ timeout: 30_000 });
    await statusSelect.focus();
    await statusSelect.press('Enter');
    const option = page.getByRole('option', { name: next, exact: true });
    await expect(option).toBeVisible();
    await option.press('Enter');
    if (next === 'Delivered') {
      await expect(adminRow.getByLabel('Shipment complete: Delivered')).toBeVisible({ timeout: 30_000 });
    } else {
      await expect(adminRow.getByRole('combobox', { name: new RegExp(`Change shipment status\\. Current status: ${next}`, 'i') })).toBeVisible({ timeout: 30_000 });
    }
  }

    await testInfo.attach('admin-delivery-result.json', {
      body: JSON.stringify({ packageReference: demoPackageReference(0), finalShipmentStatus: 'DELIVERED' }, null, 2),
      contentType: 'application/json',
    });
  });

  test('customer sees the delivered shipment tracking timeline', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
  await signInAs(page, 'customer');
  await page.goto(`/order/${demoFixtureId('order', 0)}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page.getByRole('heading', { name: /Shipment tracking/i })).toBeVisible();
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Tracking history' })).toBeVisible();

  await testInfo.attach('delivery-keyboard-result.json', {
    body: JSON.stringify({ packageReference: demoPackageReference(0), orderId: demoFixtureId('order', 0), finalShipmentStatus: 'DELIVERED' }, null, 2),
    contentType: 'application/json',
  });
  });
});
