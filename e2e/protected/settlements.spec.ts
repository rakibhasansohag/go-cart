import { expect, test } from "@playwright/test";
import { signInAs } from "./fixtures";

test.skip(
  process.env.E2E_PROTECTED !== "true",
  "Protected E2E is opt-in and must run against the isolated E2E environment.",
);

async function expectVisibleTableHover(page: import("@playwright/test").Page) {
  const row = page
    .locator("table tbody tr")
    .filter({ has: page.locator("td") })
    .first();
  const cell = row.locator("td").first();

  await expect(row).toBeVisible();
  const idleBackground = await cell.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  await row.hover();

  await expect
    .poll(() =>
      cell.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(idleBackground);
  await expect
    .poll(() => cell.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe("none");
}

async function visitDashboardRoute(
  page: import("@playwright/test").Page,
  path: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) {
        throw error;
      }
    }

    if (new URL(page.url()).pathname === path) return;
    await page.waitForTimeout(500);
  }

  await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
}

test("shared and direct admin tables have a visible hover state", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signInAs(page, "admin");
  await visitDashboardRoute(page, "/dashboard/admin/sellers");
  await expectVisibleTableHover(page);

  await visitDashboardRoute(page, "/dashboard/admin/returns");
  await expectVisibleTableHover(page);
});

test("seller can view the earnings and payday ledger for the demo store", async ({
  page,
}) => {
  await signInAs(page, "seller");
  await page.goto("/dashboard/seller/stores/gocart-demo-store/earnings", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(page).toHaveURL(
    /\/dashboard\/seller\/stores\/gocart-demo-store\/earnings/,
  );
  await expect(
    page.getByRole("heading", { name: "Earnings & payday" }),
  ).toBeVisible();
  await expect(page.getByText("USD ledger")).toBeVisible();
  await expect(
    page.getByText(/Held or blocked|No paid order groups have generated/),
  ).toBeVisible();
});

test("admin can review marketplace settlement operations", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/dashboard/admin/settlements", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/dashboard\/admin\/settlements/);
  await expect(
    page.getByRole("heading", { name: "Marketplace settlements" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create weekly batch" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No settlement entries yet|Seller \/ store/),
  ).toBeVisible();
});

test("admin can browse seller and store operations directories", async ({
  page,
}) => {
  await signInAs(page, "admin");
  await page.goto("/dashboard/admin/sellers", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/dashboard\/admin\/sellers/);
  await expect(page.getByRole("heading", { name: "Sellers" })).toBeVisible();
  await expect(page.getByText("Seller directory")).toBeVisible();

  await page.goto("/dashboard/admin/stores", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/dashboard\/admin\/stores/);
  await expect(page.getByRole("heading", { name: "Stores" })).toBeVisible();
  await expect(page.getByText("Store directory")).toBeVisible();
  const detailLink = page.getByRole("link", { name: /Details/ }).first();
  await expect(detailLink).toBeVisible();
  await detailLink.click();
  await expect(page).toHaveURL(/\/dashboard\/admin\/stores\/[\w-]+/);
  await expect(page.getByText("Store financial statement")).toBeVisible();
});

test("admin can change the commission from marketplace settings", async ({
  page,
}) => {
  await signInAs(page, "admin");
  await page.goto("/dashboard/admin/settings", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  const input = page.getByRole("spinbutton", { name: "Commission percentage" });
  const holdDays = page.getByRole("spinbutton", {
    name: "Seller payout hold / return-risk window",
  });
  await expect(
    page.getByRole("heading", { name: "Marketplace settings" }),
  ).toBeVisible();
  await expect(input).toHaveValue("2");
  await expect(holdDays).toHaveValue("7");

  await input.fill("3");
  await holdDays.fill("0");
  await page.getByRole("button", { name: "Save marketplace settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: /New settlements will use 3% commission/ })).toContainText(
    "New settlements will use 3% commission and can become eligible immediately",
  );

  await input.fill("2");
  await holdDays.fill("7");
  await page.getByRole("button", { name: "Save marketplace settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: /New settlements will use 2% commission/ })).toContainText(
    "New settlements will use 2% commission and wait 7 days",
  );
});

test("seller cannot access marketplace settlement operations", async ({
  page,
}) => {
  await signInAs(page, "seller");
  await page.goto("/dashboard/admin/settlements", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/$/);
});

test("seller cannot access marketplace settings", async ({ page }) => {
  await signInAs(page, "seller");
  await page.goto("/dashboard/admin/settings", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await expect(page).toHaveURL(/\/$/);
});

test("seller and customer cannot access seller or store financial operations routes", async ({
  page,
}) => {
  for (const role of ["seller", "customer"] as const) {
    await signInAs(page, role);
    await page.goto("/dashboard/admin/sellers", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });

    await expect(page).toHaveURL(/\/$/);

    await page.goto("/dashboard/admin/stores/not-a-store-the-user-can-read", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });

    await expect(page).toHaveURL(/\/$/);
  }
});
