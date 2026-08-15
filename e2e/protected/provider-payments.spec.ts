import { expect, test } from '@playwright/test';
import { signInAs } from './fixtures';

test.skip(
  process.env.E2E_PROTECTED !== 'true' || process.env.E2E_COMMERCE !== 'true',
  'Protected provider E2E is opt-in and requires an isolated staging/test environment.',
);

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
    await expect(closeRewardModal).toBeVisible();
    await closeRewardModal.click();
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
