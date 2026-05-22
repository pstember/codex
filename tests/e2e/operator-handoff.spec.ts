import { expect, test } from "@playwright/test";

test("Operator generates a campaign proposal from the latest Manager metrics handoff", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mara Chen manager" }).click();
  await page.waitForURL("**/manager");

  await page.getByRole("button", { name: "Run analysis" }).click();
  await page.waitForURL(/\/manager\?run=/);
  await expect(page.getByText("Operator handoff")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");
  await page.getByRole("button", { name: "Owen Patel operator" }).click();
  await page.waitForURL("**/operator");

  await expect(page.getByText("Metrics handoff")).toBeVisible();
  await page.getByRole("button", { name: "Generate proposal" }).click();
  await page.waitForURL(/\/operator\?proposal=/);

  await expect(
    page.getByRole("heading", { name: "Grill, Travel, and Everyday Carry" }),
  ).toBeVisible();
  await expect(page.getByText("Portable Charcoal Grill")).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "valid" })).toBeVisible();

  await page.getByRole("button", { name: "Approve proposal" }).click();
  await page.waitForURL(/\/operator\?proposal=.*&storefront=/);

  await expect(page.getByText("Storefront config", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, level: 2, name: "Father’s Day" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Publish storefront" }).click();
  await page.waitForURL(/\/operator\?storefront=.*&version=/);

  await expect(page.getByText("Storefront Time Machine")).toBeVisible();
  await expect(page.getByText("Active Guest version: Father’s Day")).toBeVisible();

  await page.getByRole("link", { name: "Open Guest storefront" }).click();
  await page.waitForURL("**/store");

  await expect(page.getByText("Father’s Day", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Portable Charcoal Grill")).toBeVisible();
});
