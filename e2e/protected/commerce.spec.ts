import { expect, test } from '@playwright/test';
import { demoFixtureId, demoPackageReference, demoReturnReference, signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true' || process.env.E2E_COMMERCE !== 'true',
  'Protected commerce E2E is opt-in and requires an isolated staging/test environment.',
);

test.describe.configure({ mode: 'serial' });

test('customer can place the seeded cart order and see it in order history', async ({ page }, testInfo) => {
  await signInAs(page, 'customer');
  await page.goto('/checkout', { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await expect(page.getByRole('heading', { name: 'Shipping Addresses' })).toBeVisible();
  const placeOrder = page.getByRole('button', { name: 'Place order' });
  await expect(placeOrder).toBeEnabled();
  await placeOrder.focus();
  await placeOrder.press('Enter');

  await page.waitForURL(/\/order\/[0-9a-f-]{36}$/, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const orderId = new URL(page.url()).pathname.split('/').pop();
  await testInfo.attach('created-order.json', {
    body: JSON.stringify({ orderId, url: page.url() }, null, 2),
    contentType: 'application/json',
  });

  expect(orderId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByText('Order Details', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Complete your payment' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order Information' })).toBeVisible();
  await expect(page.getByText('Total Items').locator('..')).toContainText('1');
});

test('customer can open the seeded order tracking timeline', async ({ page }) => {
  const orderId = process.env.E2E_ORDER_ID;
  test.skip(!orderId, 'E2E_ORDER_ID is required for the seeded tracking journey.');

  await signInAs(page, 'customer');
  const response = await page.goto(`/order/${orderId}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Shipment tracking/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tracking history' })).toBeVisible();
});

test('customer can review order history and returns center', async ({ page }) => {
  await signInAs(page, 'customer');

  const ordersResponse = await page.goto('/profile/orders');
  expect(ordersResponse?.status()).toBe(200);
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText(/View/i).first()).toBeVisible();

  const returnsResponse = await page.goto('/profile/returns');
  expect(returnsResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Returns Center' })).toBeVisible();
});

test('seller can reach the fulfillment order workspace', async ({ page }) => {
  await signInAs(page, 'seller');
  const response = await page.goto('/dashboard/seller/stores/gocart-demo-store/orders');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').first()).toBeVisible();
});

test('seller fulfillment workspace exposes an order search control', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/orders');

  await expect(page.getByRole('main').first()).toBeVisible();
  await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
});

test('seller can advance a demo package to Accepted', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/orders');
  await page.getByPlaceholder(/Search order, package, customer, product or SKU/i).fill(demoPackageReference(0));

  const demoRow = page.getByRole('row').filter({ hasText: demoPackageReference(0) });
  const statusSelect = demoRow.getByRole('combobox', { name: /Change package status\. Current status: Pending/i });
  await expect(statusSelect).toBeVisible();
  await statusSelect.focus();
  await statusSelect.press('Enter');
  const acceptedOption = page.getByRole('option', { name: 'Accepted', exact: true });
  await expect(acceptedOption).toBeVisible();
  await acceptedOption.click();
  await expect(demoRow.getByRole('combobox', { name: /Change package status\. Current status: Accepted/i })).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: demoPackageReference(0) }).getByRole('combobox', { name: /Change package status\. Current status: Accepted/i })).toBeVisible();
});

test('seller can advance a demo package through handoff with keyboard actions', async ({ page }) => {
  test.setTimeout(180_000);
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/orders');
  await page.getByPlaceholder(/Search order, package, customer, product or SKU/i).fill(demoPackageReference(0));

  const demoRow = page.getByRole('row').filter({ hasText: demoPackageReference(0) });
  for (const [current, next] of [
    ['Accepted', 'Processing'],
    ['Processing', 'Ready for handoff'],
    ['Ready for handoff', 'Handed off'],
  ] as const) {
    const statusSelect = demoRow.getByRole('combobox', { name: new RegExp(`Change package status\\. Current status: ${current}`, 'i') });
    await expect(statusSelect).toBeVisible({ timeout: 30_000 });
    await statusSelect.focus();
    await statusSelect.press('Enter');
    const option = page.getByRole('option', { name: next, exact: true });
    await expect(option).toBeVisible();
    await option.click();
    if (next === 'Handed off') {
      await expect(demoRow.getByLabel('Package preparation complete: Handed off')).toBeVisible({ timeout: 30_000 });
    } else {
      await expect(demoRow.getByRole('combobox', { name: new RegExp(`Change package status\\. Current status: ${next}`, 'i') })).toBeVisible({ timeout: 30_000 });
    }
  }
});

test('admin can advance the handed-off shipment to delivery with keyboard actions', async ({ page }) => {
  test.setTimeout(240_000);
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/orders');

  const search = page.getByPlaceholder(/Search order, package, store, seller, customer, product or SKU/i);
  await search.fill(demoPackageReference(0));
  const demoRow = page.getByRole('row').filter({ hasText: demoPackageReference(0) });
  await expect(demoRow).toBeVisible({ timeout: 30_000 });

  for (const [current, next] of [
    ['Awaiting receipt', 'Received at hub'],
    ['Received at hub', 'Ready for dispatch'],
    ['Ready for dispatch', 'In transit'],
    ['In transit', 'Out for delivery'],
    ['Out for delivery', 'Delivered'],
  ] as const) {
    const statusSelect = demoRow.getByRole('combobox', { name: new RegExp(`Change shipment status\\. Current status: ${current}`, 'i') });
    await expect(statusSelect).toBeVisible({ timeout: 30_000 });
    await statusSelect.focus();
    await statusSelect.press('Enter');
    const option = page.getByRole('option', { name: next, exact: true });
    await expect(option).toBeVisible();
    await option.click();
    if (next === 'Delivered') {
      await expect(demoRow.getByLabel('Shipment complete: Delivered')).toBeVisible({ timeout: 30_000 });
    } else {
      await expect(demoRow.getByRole('combobox', { name: new RegExp(`Change shipment status\\. Current status: ${next}`, 'i') })).toBeVisible({ timeout: 30_000 });
    }
  }

  await signInAs(page, 'customer');
  await page.goto(`/order/${demoFixtureId('order', 0)}`);
  await expect(page.getByRole('heading', { name: /Shipment tracking/i })).toBeVisible();
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Tracking history' })).toBeVisible();
});

test('customer can submit a return request for the delivered demo item', async ({ page }, testInfo) => {
  await signInAs(page, 'customer');
  const itemId = demoFixtureId('item', 5);
  await page.goto(`/profile/returns/new?itemId=${itemId}`);

  await expect(page.getByRole('heading', { name: 'Request a return' })).toBeVisible();
  await page.getByLabel('Describe the issue').fill('E2E return request for the delivered demo item.');
  await page.getByRole('button', { name: 'Submit return request' }).click();
  await page.waitForURL(/\/profile\/returns\/[0-9a-f-]{36}$/, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await testInfo.attach('created-return.json', {
    body: JSON.stringify({ returnUrl: page.url(), itemId }, null, 2),
    contentType: 'application/json',
  });
  await expect(page.getByText(/Return request/i).first()).toBeVisible();
});

test('seller and customer can advance the deterministic return to Received', async ({ page }) => {
  const returnReference = demoReturnReference(5);
  const returnId = demoFixtureId('return', 5);

  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/returns');
  const sellerRow = page.locator('tbody tr').filter({ hasText: returnReference });
  await expect(sellerRow).toBeVisible({ timeout: 30_000 });

  const sellerStatus = sellerRow.getByRole('button', { name: /Change return status from Requested/i });
  await sellerStatus.click();
  await page.getByRole('menuitem', { name: 'Approved', exact: true }).click();
  await expect(sellerRow).toContainText('Approved', { timeout: 30_000 });

  await sellerRow.getByRole('button', { name: /Change return status from Approved/i }).click();
  await page.getByRole('menuitem', { name: 'Awaiting shipment', exact: true }).click();
  await expect(sellerRow).toContainText('Awaiting shipment', { timeout: 30_000 });

  await signInAs(page, 'customer');
  await page.goto(`/profile/returns/${returnId}`);
  await expect(page.getByText('Awaiting shipment', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(page.getByText('Return in transit', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/returns');
  const inTransitRow = page.locator('tbody tr').filter({ hasText: returnReference });
  await expect(inTransitRow).toContainText('Return in transit', { timeout: 30_000 });
  await inTransitRow.getByRole('button', { name: /Change return status from Return in transit/i }).click();
  await page.getByRole('menuitem', { name: 'Received', exact: true }).click();
  await expect(inTransitRow).toContainText('Received', { timeout: 30_000 });

  await inTransitRow.getByRole('button', { name: /Change return status from Received/i }).click();
  await page.getByRole('menuitem', { name: 'Refund pending', exact: true }).click();
  await expect(inTransitRow).toContainText('Refund pending', { timeout: 30_000 });
});

test('admin can review the deterministic refund-pending return without issuing a live refund', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/returns');

  const adminRow = page.locator('tbody tr').filter({ hasText: demoReturnReference(5) });
  await expect(adminRow).toBeVisible({ timeout: 30_000 });
  await expect(adminRow).toContainText('Refund pending');
  const nextStep = adminRow.getByRole('combobox', { name: 'Choose next step' });
  await expect(nextStep).toBeVisible();
  await expect(nextStep.locator('option', { hasText: 'Issue payment refund' })).toHaveCount(1);
});

test('admin can reach delivery health operations', async ({ page }) => {
  await signInAs(page, 'admin');
  const response = await page.goto('/dashboard/admin/delivery-health');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').first()).toBeVisible();
});

test('admin can open returns and refunds operations', async ({ page }) => {
  await signInAs(page, 'admin');
  const response = await page.goto('/dashboard/admin/returns');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Returns & refunds/i })).toBeVisible();
});
