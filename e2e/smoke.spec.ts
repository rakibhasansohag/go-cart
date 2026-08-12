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

test('keyboard search submits a catalog query', async ({ page }) => {
  await page.goto('/');

  const search = page.locator('input[placeholder="Search products..."]');
  await expect(search).toBeVisible();
  await search.fill('Atlas');
  await search.press('Enter');

  await expect(page).toHaveURL(/\/browse\?.*search=Atlas/);
  await expect(page.getByRole('main').first()).toBeVisible();
});

test('catalog search exposes a deterministic empty state', async ({ page }) => {
  const response = await page.goto('/browse?search=definitely-not-a-demo-product');

  expect(response?.status(), '/browse empty search').toBe(200);
  await expect(page.getByText('No products found matching your filters.')).toBeVisible();
});

test('empty cart provides a keyboard-accessible shopping continuation', async ({ page }) => {
  await page.goto('/cart');

  await expect(page.getByText(/No items yet\? Continue shopping/i)).toBeVisible();
  const explore = page.getByRole('link', { name: /Explore items/i });
  await expect(explore).toBeVisible();
  await explore.focus();
  await expect(explore).toBeFocused();
  await explore.press('Enter');
  await expect(page).toHaveURL(/\/browse$/);
});

test('checkout redirects unauthenticated visitors to sign-in', async ({ page }) => {
  const response = await page.goto('/checkout');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=.*%2Fcheckout/);
});
