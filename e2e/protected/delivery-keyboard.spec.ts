import { expect, test } from '@playwright/test';
import { demoFixtureId, demoPackageReference, signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true' || process.env.E2E_COMMERCE !== 'true',
  'Protected commerce E2E is opt-in and requires an isolated staging/test environment.',
);

test('seller handoff, admin delivery, and customer tracking work with keyboard actions', async ({ page }, testInfo) => {
  test.setTimeout(300_000);

  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/orders', { waitUntil: 'domcontentloaded', timeout: 120_000 });
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
    await statusSelect.selectOption({ label: next });
    await expect(sellerRow).toContainText(next, { timeout: 30_000 });
  }

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
    await statusSelect.selectOption({ label: next });
    await expect(adminRow).toContainText(next, { timeout: 30_000 });
  }

  await signInAs(page, 'customer');
  await page.goto(`/order/${demoFixtureId('order', 0)}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page.getByRole('heading', { name: /Shipment tracking/i })).toBeVisible();
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Tracking history/i)).toBeVisible();

  await testInfo.attach('delivery-keyboard-result.json', {
    body: JSON.stringify({ packageReference: demoPackageReference(0), orderId: demoFixtureId('order', 0), finalShipmentStatus: 'DELIVERED' }, null, 2),
    contentType: 'application/json',
  });
});
