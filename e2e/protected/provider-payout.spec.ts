import { expect, test } from "@playwright/test";
import { signInAs } from "./fixtures";

test.skip(
  process.env.E2E_PROTECTED !== "true" ||
    process.env.E2E_COMMERCE !== "true" ||
    process.env.E2E_BROWSER_PAYOUT !== "true",
  "Browser provider payout E2E is opt-in and requires the isolated Stripe sandbox fixture.",
);

test("admin can create, approve, and process a real Stripe seller payout in the browser", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await signInAs(page, "admin");
  await page.goto("/dashboard/admin/settlements", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(
    page.getByRole("heading", { name: "Marketplace settlements" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create weekly batch" }).click();
  await expect(page.getByRole("status")).toContainText("Weekly batch created");

  const batches = page
    .getByRole("heading", { name: "Weekly payday batches" })
    .locator("..");
  await expect(batches.getByText(/DRAFT/)).toBeVisible({ timeout: 60_000 });
  await batches.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toContainText("Approve completed");
  await expect(
    batches.getByRole("button", { name: "Process transfers" }),
  ).toBeVisible({ timeout: 60_000 });

  await batches.getByRole("button", { name: "Process transfers" }).click();
  await expect(page.getByRole("status")).toContainText("Process completed", {
    timeout: 120_000,
  });
  await expect(batches.getByText(/PAID/).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByText("Transfer completed and funds were released to the seller."),
  ).toBeVisible();

  await testInfo.attach("browser-payout-result.json", {
    body: JSON.stringify(
      { action: "admin payout", provider: "Stripe sandbox", status: "PAID" },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
