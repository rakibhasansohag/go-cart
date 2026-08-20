import { expect, test } from "@playwright/test";

test("public home page is reachable", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/GoCart/i);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /GoCart - Discover Exclusive Deals/i }),
  ).toBeAttached();
});

test("public pages enforce the browser security header baseline", async ({
  page,
}) => {
  const response = await page.goto("/");
  const headers = await response?.allHeaders();

  expect(headers?.["x-content-type-options"]).toBe("nosniff");
  expect(headers?.["x-frame-options"]).toBe("DENY");
  expect(headers?.["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers?.["permissions-policy"]).toContain("camera=()");
  expect(headers?.["x-request-id"]).toBeTruthy();
  expect(headers?.["content-security-policy"]).toContain("default-src 'self'");
  expect(headers?.["content-security-policy"]).toContain(
    "https://js.stripe.com",
  );
  expect(headers?.["content-security-policy"]).toContain(
    "https://*.clerk.accounts.dev",
  );
});

test("public browse route is reachable", async ({ page }) => {
  const browseResponse = await page.goto("/browse");
  expect(browseResponse?.status(), "/browse").toBe(200);
  await expect(page.getByRole("main").first()).toBeVisible();
});

test("keyboard search submits a catalog query", async ({ page }) => {
  await page.goto("/");

  const search = page.locator('input[placeholder="Search products..."]');
  await expect(search).toBeVisible();
  await search.fill("Atlas");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/browse\?.*search=Atlas/);
  await expect(page.getByRole("main").first()).toBeVisible();
});

test("catalog search exposes a deterministic empty state", async ({ page }) => {
  const response = await page.goto(
    "/browse?search=definitely-not-a-demo-product",
  );

  expect(response?.status(), "/browse empty search").toBe(200);
  await expect(
    page.getByText("No products found matching your filters."),
  ).toBeVisible();
});

test("autocomplete covers loading, keyboard navigation, focus, and outside click", async ({
  page,
}) => {
  await page.route("**/api/search*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          name: "Atlas Chronograph Watch · Standard",
          link: "/product/atlas?variant=standard",
          image: "",
        },
        {
          name: "Atlas Travel Case · Standard",
          link: "/product/atlas-case?variant=standard",
          image: "",
        },
      ]),
    });
  });
  await page.goto("/");

  const search = page.locator('input[placeholder="Search products..."]');
  await search.fill("Atlas");
  await expect(page.getByText(/Searching for “Atlas”/i)).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(2);

  await search.press("ArrowDown");
  await expect(page.getByRole("option").first()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await search.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await search.blur();
  await search.focus();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("autocomplete cancellation keeps the newest query result", async ({
  page,
}) => {
  await page.route("**/api/search*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "Atlas") {
      await new Promise((resolve) => setTimeout(resolve, 900));
      try {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify([
            { name: "Stale Atlas", link: "/stale", image: "" },
          ]),
        });
      } catch {
        // The browser should abort this request when the query changes.
      }
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          name: "Aster Mug · Standard",
          link: "/product/aster?variant=standard",
          image: "",
        },
      ]),
    });
  });
  await page.goto("/");

  const search = page.locator('input[placeholder="Search products..."]');
  await search.fill("Atlas");
  await expect(page.getByText(/Searching for “Atlas”/i)).toBeVisible();
  await search.fill("Aster");
  await expect(page.getByRole("option", { name: /Aster Mug/i })).toBeVisible();
  await expect(page.getByText("Stale Atlas")).toBeHidden();
});

test("autocomplete exposes failure and empty states", async ({ page }) => {
  await page.route("**/api/search*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "broken") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "test failure" }),
      });
    } else {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
  });
  await page.goto("/");

  const search = page.locator('input[placeholder="Search products..."]');
  await search.fill("broken");
  await expect(
    page.getByText("Unable to load search suggestions. Please try again."),
  ).toBeVisible();
  await search.fill("nothing");
  await expect(
    page.getByText(/No products found for “nothing”/i),
  ).toBeVisible();
});

test("empty cart provides a keyboard-accessible shopping continuation", async ({
  page,
}) => {
  await page.goto("/cart");

  await expect(
    page.getByText(/No items yet\? Continue shopping/i),
  ).toBeVisible();
  const explore = page.getByRole("link", { name: /Explore items/i });
  await expect(explore).toBeVisible();
  await explore.focus();
  await expect(explore).toBeFocused();
  await explore.press("Enter");
  await expect(page).toHaveURL(/\/browse$/);
});

test("checkout redirects unauthenticated visitors to sign-in", async ({
  page,
}) => {
  const response = await page.goto("/checkout");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=.*%2Fcheckout/);
});

test("marketplace funds demo tells the payout story and supports keyboard progression", async ({
  page,
}) => {
  const response = await page.goto("/demo/marketplace");

  expect(response?.status(), "/demo/marketplace").toBe(200);
  await expect(
    page.getByRole("heading", {
      name: /From checkout to a confident seller payday/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Every dollar has a visible state."),
  ).toBeVisible();

  const next = page.getByRole("button", { name: /Play the 30-second story/i });
  await next.focus();
  await expect(next).toBeFocused();
  await next.press("Enter");
  await expect(page.getByText("Simulation running")).toBeVisible();

  const heldStage = page.getByRole("button", { name: /Show Funds held/i });
  await heldStage.click();
  await expect(
    page.getByRole("heading", { name: /Funds held/i }),
  ).toBeVisible();

  const reset = page.getByRole("button", { name: /Reset demo/i });
  await reset.focus();
  await expect(reset).toBeFocused();
  await reset.press("Enter");
  await expect(
    page.getByRole("heading", { name: /Order placed/i }),
  ).toBeVisible();
});
