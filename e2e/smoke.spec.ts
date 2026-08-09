import { expect, test } from '@playwright/test';

test('public home page is reachable', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/GoCart/i);
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /GoCart - Discover Exclusive Deals/i }),
  ).toBeAttached();
});

test('public browse route is reachable', async ({ page }) => {
  const browseResponse = await page.goto('/browse');
  expect(browseResponse?.status(), '/browse').toBe(200);
  await expect(page.getByRole('main').first()).toBeVisible();
});

test('checkout redirects unauthenticated visitors to sign-in', async ({ page }) => {
  const response = await page.goto('/checkout');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=.*%2Fcheckout/);
});
