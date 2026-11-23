import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/pages/ResourcesHub.tsx"), "utf8");

/**
 * Quick Links now live only on their own page (/resources/links), reached from
 * the dashboard tile. The Resources Pavilion must not repeat them as a shelf,
 * a category chip, or an admin "Add Quick Link" control.
 */
describe("Resources page no longer hosts Quick Links", () => {
  it("has no Quick Links shelf", () => {
    expect(src).not.toMatch(/resources-links/);
    expect(src).not.toMatch(/title="Quick Links"/);
  });

  it("has no Links category chip", () => {
    expect(src).not.toMatch(/key:\s*"links"/);
  });

  it("has no admin add-link control (that belongs to the Quick Links page)", () => {
    expect(src).not.toMatch(/Add Quick Link/);
    expect(src).not.toMatch(/AdminLinkDialog/);
  });

  it("still surfaces links inside search results", () => {
    expect(src).toMatch(/id="resources-results-links"/);
    expect(src).toMatch(/QuickLinksGrid/);
  });
});
