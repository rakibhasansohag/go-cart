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
