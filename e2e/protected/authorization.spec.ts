import { expect, test } from '@playwright/test';
import { signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true',
  'Protected E2E is opt-in and must run against staging only.',
);

test('customer cannot access the admin dashboard', async ({ page }) => {
  await signInAs(page, 'customer');
  await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveURL(/\/$/);
});

test('customer visiting the generic dashboard is returned to the profile workspace', async ({ page }) => {
  await signInAs(page, 'customer');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveURL(/\/profile$/);
});

test('seller cannot access the admin dashboard', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveURL(/\/$/);
});

test('admin can access the admin dashboard', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveURL(/\/dashboard\/admin/);
});

test('customer cannot access the seller dashboard', async ({ page }) => {
  await signInAs(page, 'customer');
  await page.goto('/dashboard/seller', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveURL(/\/$/);
});
