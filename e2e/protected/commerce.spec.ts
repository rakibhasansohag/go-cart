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
  await placeOrder.click();

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
  await expect(page.getByText('Total Items').locator('..').getByText('1')).toBeVisible();
});

test('customer can confirm a Stripe sandbox payment when explicitly enabled', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(
    process.env.E2E_STRIPE_PAYMENT !== 'true',
    'Set E2E_STRIPE_PAYMENT=true to run the external Stripe sandbox confirmation test.',
  );

  await signInAs(page, 'customer');
  await page.goto('/checkout', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/order\/[0-9a-f-]{36}$/, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const orderId = new URL(page.url()).pathname.split('/').pop();
  await expect(page.getByRole('heading', { name: 'Complete your payment' })).toBeVisible();
  const closeRewardModal = page.getByRole('button', { name: 'Close modal' });
  if (await closeRewardModal.count()) {
    await closeRewardModal.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(closeRewardModal).toBeHidden();
  }
  const payNow = page.getByRole('button', { name: 'Pay Now' });
  await expect(payNow).toBeVisible({ timeout: 60_000 });
  await payNow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_000);

  const stripeFrames = page.frames().filter((frame) => frame.url().includes('js.stripe.com'));
  const stripeInputs = [] as Array<{ url: string; inputs: unknown }>;
  for (const frame of stripeFrames) {
    const inputs = await frame.locator('input').evaluateAll((elements) =>
      elements.map((element) => ({
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        autocomplete: element.getAttribute('autocomplete'),
        ariaLabel: element.getAttribute('aria-label'),
        placeholder: element.getAttribute('placeholder'),
      })),
    );
    if (inputs.length) stripeInputs.push({ url: frame.url(), inputs });
  }
  await testInfo.attach('stripe-inputs.json', {
    body: JSON.stringify(stripeInputs, null, 2),
    contentType: 'application/json',
  });
  let cardFrame = undefined;
  let cardOptionClicked = false;
  for (let attempt = 0; attempt < 30 && !cardFrame; attempt += 1) {
    for (const frame of page.frames().filter((candidate) => candidate.url().includes('js.stripe.com'))) {
      if (!cardOptionClicked) {
        const cardOption = frame.getByText('Card', { exact: true });
        if (await cardOption.count()) {
          await cardOption.click();
          cardOptionClicked = true;
        }
      }
      if (await frame.locator('input').count()) {
        cardFrame = frame;
        break;
      }
    }
    if (!cardFrame) await page.waitForTimeout(500);
  }
  if (!cardFrame) {
    throw new Error(`Stripe card frame was not found. Frames: ${stripeFrames.map((frame) => frame.url()).join(' | ')}`);
  }

  const cardNumber = cardFrame.locator('input[autocomplete="cc-number"]');
  const expiry = cardFrame.locator('input[autocomplete="cc-exp"]');
  const cvc = cardFrame.locator('input[autocomplete="cc-csc"]');
  if ((await cardNumber.count()) === 0 || (await expiry.count()) === 0 || (await cvc.count()) === 0) {
    throw new Error('Stripe card frame did not expose semantic card number, expiry, and CVC fields.');
  }
  await cardNumber.fill('4242424242424242');
  await expiry.fill('12/34');
  await cvc.fill('123');
  const postalCode = cardFrame.locator('input[autocomplete="postal-code"]');
  if (await postalCode.count()) await postalCode.fill('94105');
  await page.getByRole('button', { name: 'Pay Now' }).click();

  await expect(page.getByText('Payment confirmed. Your order is ready!')).toBeVisible({ timeout: 60_000 });
  await testInfo.attach('confirmed-payment.json', {
    body: JSON.stringify({ orderId, provider: 'Stripe sandbox', status: 'Paid' }, null, 2),
    contentType: 'application/json',
  });
});

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

test('seller can advance a demo package to Accepted', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/orders');

  const demoRow = page.getByRole('row').filter({ hasText: demoPackageReference(0) });
  const statusButton = demoRow.getByRole('button', { name: /Change package status\. Current status: Pending/i });
  await expect(statusButton).toBeVisible();
  await statusButton.click();
  await expect(page.getByText('Preparation steps', { exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: /Accepted/ }).click();
  await expect(demoRow.getByRole('button', { name: /Change package status\. Current status: Accepted/i })).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: demoPackageReference(0) }).getByRole('button', { name: /Change package status\. Current status: Accepted/i })).toBeVisible();
});

test('admin can advance a handed-off demo shipment to Delivered', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/orders', { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await page.getByPlaceholder(/Search order, package/i).fill(demoPackageReference(4));
  const demoRow = page.getByRole('row').filter({ hasText: demoPackageReference(4) });
  await expect(demoRow).toBeVisible();
  const shipmentStatus = demoRow.getByRole('button', { name: /Change shipment status\. Current status: Received at hub/i });
  await expect(shipmentStatus).toBeVisible();
  await shipmentStatus.click();
  await page.getByRole('menuitem', { name: 'Delivered', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Confirm shipment update');
  await page.getByRole('button', { name: 'Confirm update' }).click();
  await expect(demoRow.getByLabel('Shipment complete: Delivered')).toBeVisible({ timeout: 30_000 });
});

test('customer can submit a return request for the delivered demo item', async ({ page }, testInfo) => {
  await signInAs(page, 'customer');
  const itemId = demoFixtureId('item', 11);
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

test('seller can approve and receive the seeded return workflow', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/returns', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByPlaceholder(/Search return/i).fill(demoFixtureId('return', 5).slice(-8).toUpperCase());
  await expect(page.getByRole('row')).toHaveCount(2, { timeout: 30_000 });

  const returnRow = page.getByRole('row').filter({ hasText: demoReturnReference(5) });
  await expect(returnRow).toBeVisible();
  const statusButton = returnRow.getByRole('button', { name: /Change return status from Requested/i });
  await statusButton.press('Space');
  await expect(page.getByText('Return next steps', { exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Approved', exact: true }).click();
  await expect(returnRow.getByText('Approved', { exact: true })).toBeVisible({ timeout: 30_000 });

  const approvedStatusButton = returnRow.getByRole('button', { name: /Change return status from Approved/i });
  await approvedStatusButton.click({ force: true });
  await expect(page.getByText('Return next steps', { exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Awaiting shipment', exact: true }).click();
  await expect(returnRow.getByText('Awaiting shipment', { exact: true })).toBeVisible({ timeout: 30_000 });
});

test('customer can mark the seeded return as shipped', async ({ page }) => {
  await signInAs(page, 'customer');
  await page.goto(`/profile/returns/${demoFixtureId('return', 5)}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page.getByText('Awaiting shipment', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(page.getByText('Return in transit', { exact: true })).toBeVisible({ timeout: 30_000 });
});

test('seller can receive the shipped return', async ({ page }) => {
  await signInAs(page, 'seller');
  await page.goto('/dashboard/seller/stores/gocart-demo-store/returns', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByPlaceholder(/Search return/i).fill(demoFixtureId('return', 5).slice(-8).toUpperCase());
  await expect(page.getByRole('row')).toHaveCount(2, { timeout: 30_000 });
  const returnRow = page.getByRole('row').filter({ hasText: demoReturnReference(5) });
  await expect(returnRow).toBeVisible();
  const transitStatusButton = returnRow.getByRole('button', { name: /Change return status from Return in transit/i });
  await transitStatusButton.click();
  await expect(page.getByText('Return next steps', { exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Received', exact: true }).click();
  await expect(returnRow.getByText('Received', { exact: true })).toBeVisible({ timeout: 30_000 });
});

test('admin can move the seeded return to refund pending', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/dashboard/admin/returns', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByPlaceholder(/Search return/i).fill(demoFixtureId('return', 5).slice(-8).toUpperCase());
  await expect(page.getByRole('row')).toHaveCount(2, { timeout: 30_000 });
  const adminRow = page.getByRole('row').filter({ hasText: demoReturnReference(5) });
  await expect(adminRow).toBeVisible();
  const adminStatusButton = adminRow.getByRole('button', { name: 'Choose next step' });
  await adminStatusButton.click();
  await expect(page.getByText('Admin resolution steps', { exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Refund pending', exact: true }).click();
  await expect(adminRow.getByText('Refund pending', { exact: true })).toBeVisible({ timeout: 30_000 });
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
