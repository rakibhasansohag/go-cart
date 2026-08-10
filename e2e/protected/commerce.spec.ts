import { expect, test } from '@playwright/test';
import { signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true' || process.env.E2E_COMMERCE !== 'true',
  'Protected commerce E2E is opt-in and requires an isolated staging/test environment.',
);

test('customer can open the seeded order tracking timeline', async ({ page }) => {
  const orderId = process.env.E2E_ORDER_ID;
  test.skip(!orderId, 'E2E_ORDER_ID is required for the seeded tracking journey.');

  await signInAs(page, 'customer');
  const response = await page.goto(`/order/${orderId}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Shipment tracking/i })).toBeVisible();
  await expect(page.getByText(/Tracking history/i)).toBeVisible();
});

test('seller can reach the fulfillment order workspace', async ({ page }) => {
  await signInAs(page, 'seller');
  const response = await page.goto('/dashboard/seller/stores/gocart-demo-store/orders');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').first()).toBeVisible();
});

test('admin can reach delivery health operations', async ({ page }) => {
  await signInAs(page, 'admin');
  const response = await page.goto('/dashboard/admin/delivery-health');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').first()).toBeVisible();
});
