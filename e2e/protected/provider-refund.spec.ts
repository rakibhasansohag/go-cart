import { expect, test } from '@playwright/test';
import { demoReturnReference, signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true' || process.env.E2E_COMMERCE !== 'true' || process.env.E2E_BROWSER_REFUND !== 'true',
  'Browser provider refund E2E is opt-in and requires the isolated sandbox fixture.',
);

test('admin can issue a real Stripe refund and reconcile returned inventory in the browser', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/returns', { waitUntil: 'domcontentloaded', timeout: 120_000 });

  const row = page.locator('tbody tr').filter({ hasText: demoReturnReference(5) });
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(row).toContainText('Refund pending');

  await row.getByRole('combobox', { name: 'Choose next step' }).selectOption({ label: 'Issue payment refund' });
  await expect(row.locator('span').filter({ hasText: 'Refunded' })).toBeVisible({ timeout: 90_000 });
  await expect(row.getByRole('button', { name: 'Reconcile inventory' })).toBeVisible();

  await row.getByRole('button', { name: 'Reconcile inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Reconcile returned inventory' })).toBeVisible();
  const restockCheckbox = page.getByRole('checkbox').first();
  await expect(restockCheckbox).toBeVisible();
  await restockCheckbox.click();
  await page.getByRole('button', { name: 'Save inventory changes' }).click();

  await expect(page.getByText('1 item(s) added back to inventory.')).toBeVisible({ timeout: 60_000 });
  await expect(row).toContainText('Refunded');
  await testInfo.attach('browser-refund-result.json', {
    body: JSON.stringify({ return: demoReturnReference(5), refund: 'Stripe sandbox', restockedUnits: 1, status: 'Refunded' }, null, 2),
    contentType: 'application/json',
  });
});
