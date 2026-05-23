import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("Operator publishes Father’s Day and revamps it into Secret Santa", async ({ page }) => {
  await page.goto("/admin");
  await signIn(page, "manager@demo.com", "manager-demo-pass");
  await page.waitForURL("**/manager");

  await page.getByRole("button", { name: "Run analysis" }).click();
  await page.waitForURL(/\/manager\?run=/);
  await expect(page.getByText("Operator handoff")).toBeVisible();
  await expect(page.getByText("Codex live window")).toBeVisible();
  await expect(page.getByText("Metrics trace saved for Manager review.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");
  await page.goto("/admin");
  await signIn(page, "operator@demo.com", "operator-demo-pass");
  await page.waitForURL("**/operator");

  await expect(page.getByText("Metrics handoff")).toBeVisible();
  await page.getByRole("button", { name: "Generate proposal" }).click();
  await page.waitForURL(/\/operator\?proposal=/);

  await expect(
    page.getByRole("heading", { name: "Father’s Day Picks From Live Catalog Signals" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Portable Charcoal Grill" })).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "valid" })).toBeVisible();

  await page.getByRole("button", { name: "Approve proposal" }).click();
  await page.waitForURL(/\/operator\?proposal=.*&storefront=/);

  await expect(page.getByText("Storefront config", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, level: 2, name: "Father’s Day" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lead with practical gifts that have enough stock and commercial strength.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Publish storefront" }).click();
  await page.waitForURL(/\/operator\?storefront=.*&version=/);

  await expect(page.getByText("Storefront Time Machine")).toBeVisible();
  await expect(page.getByText("Active Guest version: Father’s Day")).toBeVisible();
  await expect(page.getByText("Version delta")).toBeVisible();
  await expect(
    page.getByText("Baseline Atlas & Co. to Father’s Day", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Campaign changed")).toBeVisible();
  await expect(page.getByText("Product changes")).toBeVisible();
  await expect(page.getByText("Hero visual prompt")).toBeVisible();
  await expect(page.getByText("Strategic readout")).toBeVisible();

  await page.getByRole("button", { name: "Revamp for Secret Santa" }).click();
  await page.waitForURL(/\/operator\?proposal=/);

  await expect(
    page.getByRole("heading", { name: "Secret Santa Gifts That Work Hard" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Pour-Over Coffee Set" })).toBeVisible();
  await expect(page.getByText("Gift buyers shopping useful under-£50 products.")).toBeVisible();

  await page.getByRole("button", { name: "Approve proposal" }).click();
  await page.waitForURL(/\/operator\?proposal=.*&storefront=/);

  await expect(
    page.getByRole("heading", { exact: true, level: 2, name: "Secret Santa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lead with affordable, giftable products that are healthy in stock.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Publish storefront" }).click();
  await page.waitForURL(/\/operator\?storefront=.*&version=/);

  await expect(page.getByText("Active Guest version: Secret Santa")).toBeVisible();
  await expect(
    page.getByText("Baseline Atlas & Co. to Secret Santa", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Secret Santa Gifts That Work Hard" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Guest storefront" }).click();
  await page.waitForURL("**/");

  await expect(page.getByText("Secret Santa", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lead with affordable, giftable products that are healthy in stock.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pour-Over Coffee Set" }).first()).toBeVisible();

  await page.getByLabel("Preview version").selectOption({ label: "Father’s Day (inactive)" });
  await page.getByRole("button", { name: "View version" }).click();
  await page.waitForURL(/\/\?version=/);

  await expect(page.getByText("Previewing inactive version")).toBeVisible();
  await expect(page.getByText("Father’s Day", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lead with practical gifts that have enough stock and commercial strength.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add" }).first().click();
  await expect(page.getByText("Anonymous cart")).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
});
