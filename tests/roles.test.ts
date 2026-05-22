import { describe, expect, it } from "vitest";
import { can, getPermissions } from "@/domain/roles";

describe("role permissions", () => {
  it("allows managers to ask deep metric questions without publishing storefronts", () => {
    expect(can("manager", "ask_deep_metrics")).toBe(true);
    expect(can("manager", "publish_storefront")).toBe(false);
  });

  it("allows operators to approve and publish campaigns without deep metrics access", () => {
    expect(can("operator", "approve_campaign")).toBe(true);
    expect(can("operator", "publish_storefront")).toBe(true);
    expect(can("operator", "ask_deep_metrics")).toBe(false);
  });

  it("keeps guests limited to storefront viewing", () => {
    expect(getPermissions("guest")).toEqual(["view_storefront"]);
  });
});
