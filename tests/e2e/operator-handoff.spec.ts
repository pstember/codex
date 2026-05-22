import { expect, test } from "@playwright/test";

test("Operator publishes Father’s Day and revamps it into Secret Santa", async ({ page }) => {
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
      name: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
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
    page.getByRole("heading", { name: "Secret Santa Gifts That Look Effortless" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Pour-Over Coffee Set" })).toBeVisible();
  await expect(page.getByText("under £50")).toBeVisible();

  await page.getByRole("button", { name: "Approve proposal" }).click();
  await page.waitForURL(/\/operator\?proposal=.*&storefront=/);

  await expect(
    page.getByRole("heading", { exact: true, level: 2, name: "Secret Santa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Secret Santa gifts under £50 that do not feel last-minute.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Publish storefront" }).click();
  await page.waitForURL(/\/operator\?storefront=.*&version=/);

  await expect(page.getByText("Active Guest version: Secret Santa")).toBeVisible();
  await expect(
    page.getByText("Baseline Atlas & Co. to Secret Santa", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Playful office Secret Santa gifting.", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Guest storefront" }).click();
  await page.waitForURL("**/store");

  await expect(page.getByText("Secret Santa", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Secret Santa gifts under £50 that do not feel last-minute.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pour-Over Coffee Set" })).toBeVisible();

  await page.getByLabel("Preview version").selectOption({ label: "Father’s Day (inactive)" });
  await page.getByRole("button", { name: "View version" }).click();
  await page.waitForURL(/\/store\?version=/);

  await expect(page.getByText("Previewing inactive version")).toBeVisible();
  await expect(page.getByText("Father’s Day", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
    }),
  ).toBeVisible();

  await page.goto("/?step=guest-preview");

  const captureChecklist = page.getByRole("region", { name: "Loom capture checklist" });
  await expect(captureChecklist.getByRole("link", { name: /Opening frame/ })).toHaveAttribute(
    "href",
    "/?step=guest-preview",
  );
  await expect(captureChecklist.getByRole("link", { name: /Manager trace/ })).toHaveAttribute(
    "href",
    /\/manager\?run=/,
  );
  await expect(captureChecklist.getByRole("link", { name: /Operator workspace/ })).toHaveAttribute(
    "href",
    /\/operator\?proposal=/,
  );
  await expect(captureChecklist.getByRole("link", { name: /Time Machine/ })).toHaveAttribute(
    "href",
    /\/operator\?version=/,
  );

  await captureChecklist.getByRole("link", { name: /Guest close/ }).click();
  await page.waitForURL(/\/store\?version=/);
  await expect(page.getByText("Secret Santa", { exact: true })).toBeVisible();
});
