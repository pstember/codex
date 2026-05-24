import { describe, expect, it } from "vitest";
import { adminWorkspaces } from "@/app/admin/workspaces";

describe("admin workspaces", () => {
  it("shows storefront studio before insight on the admin landing page", () => {
    expect(adminWorkspaces.map((workspace) => workspace.label)).toEqual([
      "Storefront Studio",
      "Insight",
    ]);
  });
});
