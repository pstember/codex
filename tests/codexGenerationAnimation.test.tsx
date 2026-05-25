import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodexGenerationAnimation } from "@/app/components/CodexGenerationAnimation";

describe("CodexGenerationAnimation", () => {
  it("renders an accessible loading animation for Codex insight and design runs", () => {
    const insightMarkup = renderToStaticMarkup(
      <CodexGenerationAnimation label="Codex is generating an insight" tone="light" />,
    );
    const designMarkup = renderToStaticMarkup(
      <CodexGenerationAnimation label="Codex is generating a storefront design" tone="dark" />,
    );

    expect(insightMarkup).toContain('role="status"');
    expect(insightMarkup).toContain("Codex is generating an insight");
    expect(insightMarkup).toContain("<animateTransform");
    expect(insightMarkup).toContain('attributeName="transform"');
    expect(designMarkup).toContain("Codex is generating a storefront design");
    expect(designMarkup).toContain("bg-white/5");
  });
});
