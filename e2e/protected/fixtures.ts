import { clerk } from '@clerk/testing/playwright';
import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';

export type E2ERole = 'customer' | 'seller' | 'admin';

export function demoFixtureId(kind: string, index: number): string {
  const hex = createHash('sha256')
    .update(`gocart-demo:${kind}:${index}`)
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function demoPackageReference(index: number): string {
  return `#PKG-${demoFixtureId('group', index).replaceAll('-', '').toUpperCase().slice(-7)}`;
}

export function demoReturnReference(index: number): string {
  return `#${demoFixtureId('return', index).slice(-8).toUpperCase()}`;
}

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

  // Keep the unrelated daily reward overlay from covering protected journeys.
  await page.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(`gocart_checkin_dismissed_${today}`, 'true');
  });

  // Clerk's server-side testing helper avoids UI MFA/email-code flows while
  // still exercising the real Clerk session and middleware integration.
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  // A single workflow may intentionally switch between customer, seller, and
  // admin actors. Clear the previous actor before creating the next session.
  await clerk.signOut({ page });
  await clerk.signIn({ page, emailAddress: email });
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
}
