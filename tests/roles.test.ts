import { describe, expect, it } from "vitest";
import { can, getPermissions } from "@/domain/roles";

describe("role permissions", () => {
  it("allows managers to use every staff workspace", () => {
    expect(can("manager", "ask_deep_metrics")).toBe(true);
    expect(can("manager", "view_codex_traces")).toBe(true);
    expect(can("manager", "publish_storefront")).toBe(true);
  });

  it("allows analysts to use insight without storefront management", () => {
    expect(can("analyst", "ask_deep_metrics")).toBe(true);
    expect(can("analyst", "view_codex_traces")).toBe(true);
    expect(can("analyst", "publish_storefront")).toBe(false);
  });

  it("allows operators to manage storefronts without insight access", () => {
    expect(can("operator", "ask_deep_metrics")).toBe(false);
    expect(can("operator", "view_codex_traces")).toBe(false);
    expect(can("operator", "publish_storefront")).toBe(true);
  });

  it("keeps guests limited to storefront viewing", () => {
    expect(getPermissions("guest")).toEqual(["view_storefront"]);
  });
});
