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
});
