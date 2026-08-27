import { expect, test } from '@playwright/test';
import { signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true',
  'Protected E2E is opt-in and must run against isolated staging or Docker data.',
);

test('seller analytics renders database-backed metric semantics without hard-coded growth', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store', { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await expect(page.getByRole('heading', { name: /GoCart Demo Store Overview/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Gross Revenue', { exact: true })).toBeVisible();
  await expect(page.getByText(/seller payable/i)).toBeVisible();
  await expect(page.getByText(/repeat customers/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revenue trend' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inventory risk' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('+15.3%', { exact: true })).toHaveCount(0);
  await expect(page.getByText('+4.2%', { exact: true })).toHaveCount(0);
  await expect(page.getByText('+9.1%', { exact: true })).toHaveCount(0);
});

test('admin overview does not present invented growth percentages', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await expect(page.getByRole('heading', { name: 'Admin Overview' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('+12.4%', { exact: true })).toHaveCount(0);
  await expect(page.getByText('+8.2%', { exact: true })).toHaveCount(0);
  await expect(page.getByText('+5.1%', { exact: true })).toHaveCount(0);
});
