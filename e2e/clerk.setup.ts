import { clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

setup.describe.configure({ mode: 'serial' });

setup('initialize Clerk testing', async ({}, testInfo) => {
  testInfo.skip(
    process.env.E2E_PROTECTED !== 'true',
    'Protected E2E is opt-in; set E2E_PROTECTED=true in the staging environment.',
  );

  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  testInfo.skip(
    !publishableKey || !secretKey,
    'Protected E2E requires staging Clerk publishable and secret keys.',
  );

  process.env.CLERK_PUBLISHABLE_KEY = publishableKey;
  await clerkSetup();
});
