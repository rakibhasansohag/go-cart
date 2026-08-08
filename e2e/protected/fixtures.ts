import { clerk } from '@clerk/testing/playwright';
import type { Page } from '@playwright/test';

export type E2ERole = 'customer' | 'seller' | 'admin';

const roleEnvKeys: Record<E2ERole, string> = {
  customer: 'E2E_CUSTOMER_EMAIL',
  seller: 'E2E_SELLER_EMAIL',
  admin: 'E2E_ADMIN_EMAIL',
};

export async function signInAs(page: Page, role: E2ERole): Promise<void> {
  const email = process.env[roleEnvKeys[role]];
  if (!email) {
    throw new Error(`${roleEnvKeys[role]} is required for protected E2E tests.`);
  }

  // Clerk's server-side testing helper avoids UI MFA/email-code flows while
  // still exercising the real Clerk session and middleware integration.
  await page.goto('/');
  await clerk.signIn({ page, emailAddress: email });
  await page.goto('/');
}
