import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/components/showcase/ImmersiveShowcase.tsx"),
  "utf8"
);

/** The category tab strip: a single <div> wrapping the mapped shortcut buttons. */
function tabStripClasses(): string {
  const start = source.indexOf('aria-label="Showcase categories"');
  expect(start).toBeGreaterThan(-1);
  const match = /<div className="([^"]+)">\s*\{visibleCategoryKeys\.map/.exec(
    source.slice(start)
  );
  expect(match).not.toBeNull();
  return match![1];
}

function tabButtonClasses(): string {
  const start = source.indexOf("visibleCategoryKeys.map");
  const match = /className="([^"]*rounded-full[^"]*)"/.exec(source.slice(start));
  expect(match).not.toBeNull();
  return match![1];
}

describe("showcase category tab strip", () => {
  it("stays one horizontally scrollable row on phones", () => {
    const classes = tabStripClasses();
    const base = classes.split(/\s+/).filter((c) => !c.startsWith("sm:"));
    expect(base).toContain("overflow-x-auto");
    expect(base.some((c) => c === "flex-wrap")).toBe(false);
    expect(classes).toContain("no-scrollbar");
  });

  it("keeps the laptop layout wrapping and evenly spread", () => {
    const classes = tabStripClasses();
    expect(classes).toContain("sm:flex-wrap");
    expect(classes).toContain("sm:justify-between");
    expect(classes).toContain("sm:overflow-visible");
  });

  it("keeps phone tabs full height and laptop tabs stretched", () => {
    const classes = tabButtonClasses();
    expect(classes).toContain("shrink-0");
    expect(classes).toContain("whitespace-nowrap");
    expect(classes).toContain("h-11");
    expect(classes).toContain("sm:flex-1");
  });

  it("keeps phone tabs a readable size, and restores laptop sizing", () => {
    const classes = tabButtonClasses();
    const base = classes.split(/\s+/).filter((c) => !c.startsWith("sm:"));
    // Phone: roomier padding, 13px label and 16px icon than the tightest fit.
    expect(base).toContain("px-2.5");
    expect(base).toContain("text-[13px]");
    expect(base).toContain("[&_svg]:size-4");
    expect(base).toContain("gap-1");
    // Laptop: original label size, padding, icon size and spread.
    expect(classes).toContain("sm:text-sm");
    expect(classes).toContain("sm:px-2");
    expect(classes).toContain("sm:[&_svg]:size-4");
    expect(classes).toContain("sm:flex-1");
    // Phone must not inherit the laptop label size or the tightest fit.
    expect(base).not.toContain("text-sm");
    expect(base).not.toContain("text-xs");
    expect(base).not.toContain("px-2");
    expect(base).not.toContain("px-3");
  });
});
