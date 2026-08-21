import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const healthURL = new URL("/api/health", baseURL).toString();
const usesExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : Number(process.env.E2E_RETRIES ?? 0),
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: usesExternalServer
    ? undefined
    : {
        command: "bun --no-env-file scripts/e2e-local.ts server",
        // The root page can perform substantial server-side work. Use the
        // intentionally minimal health endpoint for server readiness, then
        // let each test exercise its real route through `baseURL`.
        url: healthURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: "clerk-setup",
      testMatch: /clerk\.setup\.ts/,
    },
    {
      name: "chromium",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "protected-chromium",
      testMatch: /protected\/.*\.spec\.ts/,
      dependencies: ["clerk-setup"],
      // Clerk session creation plus a cold authenticated route compilation can
      // exceed Playwright's 30-second default on local Windows development.
      timeout: 90_000,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
