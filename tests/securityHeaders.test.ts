import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Next.js security headers", () => {
  it("sets baseline browser security headers on every route", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers?.[0]).toMatchObject({
      source: "/(.*)",
      headers: expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    });
    expect(
      headers?.[0]?.headers.find((header) => header.key === "Content-Security-Policy")?.value,
    ).toContain("frame-ancestors 'none'");
  });
});
