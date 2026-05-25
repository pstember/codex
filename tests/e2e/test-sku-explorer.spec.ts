import { expect, type Page, test } from "@playwright/test";

async function signInAsManager(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill("manager@demo.com");
  await page.getByLabel("Password").fill("manager-demo-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
}

test("insight workbench exposes a reactive all-SKU metric explorer", async ({ page }) => {
  await signInAsManager(page);
  await page.goto("/admin/insights");

  const explorer = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Every SKU, not just the recommendation" }) });

  await expect(explorer.getByText("29 of 29 SKUs shown")).toBeVisible();
  await expect(explorer.getByRole("button", { name: /Cast Iron Grill Press/ })).toBeVisible();

  await explorer.getByLabel("Signal").selectOption("Hold");
  await expect(explorer.getByText("of 29 SKUs shown")).toBeVisible();
  await expect(explorer.getByRole("button", { name: /Espresso Machine/ })).toBeVisible();

  await explorer.getByLabel("Search SKUs").fill("espresso machine");
  await expect(explorer.getByText("1 of 29 SKUs shown")).toBeVisible();
  await expect(explorer.getByRole("button", { name: /Espresso Machine/ })).toBeVisible();

  await explorer.getByLabel("Sort by").selectOption("product_risk_score");
  await expect(explorer.getByText("Risk score").last()).toBeVisible();

  await explorer.getByRole("button", { name: /Espresso Machine/ }).click();
  await expect(explorer.getByText("Selected SKU")).toBeVisible();
  await expect(explorer.getByRole("heading", { name: "Espresso Machine" })).toBeVisible();
});

test("insight workbench SKU explorer remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ height: 780, width: 390 });
  await signInAsManager(page);
  await page.goto("/admin/insights");

  const explorer = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Every SKU, not just the recommendation" }) });

  await expect(explorer.getByText("29 of 29 SKUs shown")).toBeVisible();
  await explorer.getByLabel("Signal").selectOption("Promote");
  await explorer.getByLabel("Search SKUs").fill("grill");
  await expect(explorer.getByRole("button", { name: /Cast Iron Grill Press/ })).toBeVisible();
  await explorer.getByLabel("Sort by").selectOption("product_giftability_score");
  await expect(explorer.getByText("Giftability score").last()).toBeVisible();
});
