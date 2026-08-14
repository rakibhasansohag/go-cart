import { expect, test } from '@playwright/test';
import { signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true',
  'Protected E2E is opt-in and must run against the isolated E2E environment.',
);

test('seller can view the earnings and payday ledger for the demo store', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/earnings', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/dashboard\/seller\/stores\/gocart-demo-store\/earnings/);
  await expect(page.getByRole('heading', { name: 'Earnings & payday' })).toBeVisible();
  await expect(page.getByText('USD ledger')).toBeVisible();
  await expect(page.getByText(/Held or blocked|No paid order groups have generated/)).toBeVisible();
});

test('admin can review marketplace settlement operations', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/settlements', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/dashboard\/admin\/settlements/);
  await expect(page.getByRole('heading', { name: 'Marketplace settlements' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create weekly batch' })).toBeVisible();
  await expect(page.getByText(/No settlement entries yet|Seller \/ store/)).toBeVisible();
});

test('admin can change the commission from marketplace settings', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/settings', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  const input = page.getByRole('spinbutton', { name: 'Commission percentage' });
  await expect(page.getByRole('heading', { name: 'Marketplace settings' })).toBeVisible();
  await expect(input).toHaveValue('2');

  await input.fill('3');
  await page.getByRole('button', { name: 'Save commission' }).click();
  await expect(page.getByRole('status')).toContainText('New settlements will use 3% commission.');

  await input.fill('2');
  await page.getByRole('button', { name: 'Save commission' }).click();
  await expect(page.getByRole('status')).toContainText('New settlements will use 2% commission.');
});

test('seller cannot access marketplace settlement operations', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/admin/settlements', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/$/);
});

test('seller cannot access marketplace settings', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/admin/settings', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/$/);
});
