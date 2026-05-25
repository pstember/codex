import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    )
    .toBe(true);
}

async function expectPanelDockedBeside(
  page: Page,
  panelHeading: string,
  workspaceLocator: ReturnType<Page["locator"]>,
) {
  const panel = page
    .getByRole("heading", { name: panelHeading })
    .locator("xpath=ancestor::aside[1]");
  const [panelBox, workspaceBox] = await Promise.all([
    panel.boundingBox(),
    workspaceLocator.boundingBox(),
  ]);

  expect(panelBox, `${panelHeading} panel should have a layout box`).not.toBeNull();
  expect(workspaceBox, "Workspace should have a layout box").not.toBeNull();
  expect(panelBox?.y ?? 0).toBeLessThanOrEqual(1);
  expect(panelBox?.height ?? 0).toBeGreaterThanOrEqual((page.viewportSize()?.height ?? 0) - 1);
  expect(workspaceBox?.x ?? 0).toBeLessThan(panelBox?.x ?? 0);
  expect((workspaceBox?.x ?? 0) + (workspaceBox?.width ?? 0)).toBeLessThanOrEqual(
    (panelBox?.x ?? 0) - 8,
  );
}

test("Staff admin opens the insight and storefront workspaces", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin");
  await signIn(page, "manager@demo.com", "manager-demo-pass");
  await page.waitForURL("**/admin");

  await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Insight" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Storefront Studio" })).toBeVisible();

  await page.getByRole("link", { name: "Insight" }).click();
  await page.waitForURL("**/admin/insights");
  await expect(page.getByRole("heading", { name: "Insight workbench" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Codex exchange" })).toBeVisible();
  await expectPanelDockedBeside(
    page,
    "Codex exchange",
    page.getByRole("heading", { name: "Atlas data questions" }).locator("xpath=ancestor::form[1]"),
  );
  await expectNoHorizontalOverflow(page);
  await expect(page.locator("header nav")).toContainText("Store");
  await expect(page.locator("header nav")).toContainText("Admin");
  await expect(page.locator("header nav")).toContainText("Logout");
  await expect(page.locator("header nav")).not.toContainText("Insight");
  await expect(page.locator("header nav")).not.toContainText("Storefront Studio");
  await expect(page.locator("header nav")).not.toContainText("Manual");

  await page.goto("/admin");
  await page.getByRole("link", { name: "Storefront Studio" }).click();
  await page.waitForURL("**/admin/storefront");
  await expect(page.getByRole("heading", { name: "Event storefront studio" })).toBeVisible();
  await expect(page.getByLabel("Start from")).toBeVisible();
  await expect(page.getByLabel("Source version")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Basic Atlas & Co." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview for me" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish for everyone" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open observability" }).click();
  await expect(page.getByRole("heading", { name: "Visual exchange" })).toBeVisible();
  await expectPanelDockedBeside(
    page,
    "Visual exchange",
    page
      .getByRole("heading", { name: "Event storefront studio" })
      .locator("xpath=ancestor::div[contains(@class, 'd20-ink')][1]"),
  );
  await expectNoHorizontalOverflow(page);
  const eventInput = page.getByLabel("Event").first();
  await expect(eventInput).toHaveValue("");
  await expect(eventInput).toHaveAttribute("placeholder", "Event to customize for, e.g. World Cup");
  await expect(eventInput).toHaveAttribute("title", "Event to customize for, e.g. World Cup");
  await page.getByRole("button", { name: "Halloween storefront for cosy office gifts" }).click({
    force: true,
  });
  await eventInput.fill("Halloween");
  await expect(eventInput).toHaveValue("Halloween");
  await expect(page.getByText("Style gallery", { exact: true })).toBeVisible();
  await expect(page.getByText("Saved storefront styles")).toBeVisible();
  await expect(page.getByText("Edit and compare")).toBeVisible();
  await expect(page.getByText("Compare with active", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Open public storefront" })).toHaveCount(1);
  await expect(page.getByText("Active to current")).toBeVisible();
  await expect(page.getByText("Copy diff")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Visual exchange" })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("**/");
  await page.goto("/admin");
  await signIn(page, "analyst@demo.com", "analyst-demo-pass");
  await page.waitForURL("**/admin");

  await expect(page.getByRole("link", { name: "Insight" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Storefront Studio" })).toBeDisabled();

  await page.goto("/admin/storefront");
  await page.waitForURL("**/admin?error=forbidden");
  await expect(page.getByText("You do not have access to that workspace.")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("**/");
  await page.goto("/admin");
  await signIn(page, "operator@demo.com", "operator-demo-pass");
  await page.waitForURL("**/admin");

  await expect(page.getByRole("button", { name: "Insight" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Storefront Studio" })).toBeVisible();

  await page.goto("/admin/insights");
  await page.waitForURL("**/admin?error=forbidden");
  await expect(page.getByText("You do not have access to that workspace.")).toBeVisible();

  await page.getByRole("link", { name: "Storefront Studio" }).click();
  await page.waitForURL("**/admin/storefront");
  await expect(page.getByRole("heading", { name: "Visual adaptation studio" })).toBeVisible();

  const oldInsightsResponse = await page.goto("/insights");
  expect(oldInsightsResponse?.status()).toBe(404);
  const removedStorefrontRouteResponse = await page.goto("/operator");
  expect(removedStorefrontRouteResponse?.status()).toBe(404);
  const oldManualResponse = await page.goto("/manual");
  expect(oldManualResponse?.status()).toBe(404);
});

test("admin observability stays within the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await signIn(page, "manager@demo.com", "manager-demo-pass");
  await page.waitForURL("**/admin");

  await page.getByRole("link", { name: "Insight" }).click();
  await page.waitForURL("**/admin/insights");
  await expect(page.getByRole("heading", { name: "Codex exchange" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Collapse observability" }).click();
  await expect(page.getByRole("button", { name: "Open observability" })).toContainText("<");
  await expectNoHorizontalOverflow(page);
});

test("public storefront version controls are only visible to storefront staff", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Preview version")).toBeHidden();
  await expect(page.getByText("Atlas & Co. gift shop")).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff admin" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("link", { name: "About Atlas & Co." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms & Conditions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shipping & Returns" })).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "A bright Atlas & Co. tabletop scene with coffee gear, a desk lamp, and everyday gift essentials.",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("img", {
        name: "Pour-Over Coffee Set product presentation image",
      })
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse all products" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cart (0)" })).toBeVisible();
  await page.getByLabel("Search products").fill("coffee");
  await expect(page.getByText("Pour-Over Coffee Set").first()).toBeVisible();
  await page.getByLabel("Search products").fill("");
  await page.getByLabel("Category").selectOption("Desk gadgets");
  await expect(page.getByText("Mug Warmer Coaster").first()).toBeVisible();
  await page.getByLabel("Category").selectOption("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of")).toBeVisible();
  const catalog = page.locator("#catalog");
  await catalog.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("button", { name: "Cart (1)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 items" })).toBeVisible();

  await page.goto("/admin");
  await signIn(page, "manager@demo.com", "manager-demo-pass");
  await page.waitForURL("**/admin");
  await page.goto("/");
  await expect(page.getByText("Signed in as Mara Chen · manager")).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff admin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(page.getByLabel("Preview version")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("**/");
  await expect(page.getByText("Atlas & Co. gift shop")).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff admin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Logout" })).toBeHidden();

  await page.goto("/admin");
  await signIn(page, "analyst@demo.com", "analyst-demo-pass");
  await page.waitForURL("**/admin");
  await page.goto("/");
  await expect(page.getByText("Signed in as Ari Singh · analyst")).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff admin" })).toBeVisible();
  await expect(page.getByLabel("Preview version")).toBeHidden();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("**/");
  await page.goto("/admin");
  await signIn(page, "operator@demo.com", "operator-demo-pass");
  await page.waitForURL("**/admin");
  await page.goto("/");
  await expect(page.getByText("Signed in as Owen Patel · operator")).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff admin" })).toBeVisible();
  await expect(page.getByLabel("Preview version")).toBeVisible();
});

test("footer links open the shopper information pages", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "About Atlas & Co." }).click();
  await page.waitForURL("**/about");
  await expect(page.getByRole("heading", { name: "About Atlas & Co." })).toBeVisible();
  await expect(page.getByText("A considered gift shop built for useful keeps.")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Terms & Conditions" }).click();
  await page.waitForURL("**/terms");
  await expect(page.getByRole("heading", { name: "Terms & Conditions" })).toBeVisible();
  await expect(
    page.getByText("Orders in this demo are not processed for fulfilment or payment."),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();
  await page.waitForURL("**/privacy");
  await expect(page.getByRole("heading", { name: "Privacy at Atlas & Co." })).toBeVisible();
  await expect(
    page.getByText("We only keep the information needed to run your order and support request."),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Shipping & Returns" }).click();
  await page.waitForURL("**/shipping-returns");
  await expect(page.getByRole("heading", { name: "Shipping & Returns" })).toBeVisible();
  await expect(
    page.getByText("Standard delivery arrives in 2 to 4 working days across the UK."),
  ).toBeVisible();
});
