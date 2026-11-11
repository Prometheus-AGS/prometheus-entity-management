import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";

describe("renderMarkdown", () => {
  it("renders markdown and applies the tag class map per call", async () => {
    await expect(renderMarkdown("# Heading\n\nText", {
      tagClassMap: { h1: ["title", "bold"], p: ["body"] },
    })).resolves.toMatch(/<h1 class="title bold">Heading<\/h1>\s*<p class="body">Text<\/p>/);
    await expect(renderMarkdown("# Heading")).resolves.toMatch(/<h1>Heading<\/h1>/);
  });

  it("escapes raw HTML and neutralises javascript links", async () => {
    const html = await renderMarkdown('<script>alert("x")</script> [l](javascript:alert(1))');
    expect(html).not.toMatch(/<script>/);
    expect(html).not.toMatch(/href="javascript:/);
  });
});
