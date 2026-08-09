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
