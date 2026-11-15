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

  it("keeps phone tabs full size and laptop tabs stretched", () => {
    const classes = tabButtonClasses();
    expect(classes).toContain("shrink-0");
    expect(classes).toContain("whitespace-nowrap");
    expect(classes).toContain("sm:flex-1");
  });
});
