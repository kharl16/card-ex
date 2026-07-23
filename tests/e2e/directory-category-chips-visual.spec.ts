import { test, expect, devices } from "@playwright/test";

/**
 * Visual regression: DirectoryCategoryChips label ↔ count spacing must stay
 * constant across breakpoints. The chip anchors label + count with a fixed
 * `gap-2` (8px) — never `justify-between` — so the gap does not widen when the
 * container grows or the viewport shifts.
 *
 * Fixture: /test-fixtures/directory-category-chips.html
 */

const FIXTURE = "/test-fixtures/directory-category-chips.html";
const EXPECTED_GAP_PX = 8;
const GAP_TOLERANCE_PX = 1;

const BREAKPOINTS = [
  { name: "mobile-portrait",  width: 360,  height: 780 },
  { name: "mobile-large",     width: 414,  height: 896 },
  { name: "tablet-portrait",  width: 768,  height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop",          width: 1440, height: 900 },
] as const;

for (const bp of BREAKPOINTS) {
  test(`DirectoryCategoryChips: gap stays constant @ ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto(FIXTURE);
    await page.waitForLoadState("networkidle");

    const grid = page.getByTestId("chips-grid");
    await expect(grid).toBeVisible();

    // Measure the horizontal gap between the label group and count badge for
    // every chip. It must equal the design token (8px) within 1px tolerance,
    // regardless of chip width.
    const gaps = await grid.evaluate((root) => {
      const chips = Array.from(root.querySelectorAll<HTMLElement>(".chip"));
      return chips.map((chip) => {
        const label = chip.querySelector<HTMLElement>(".label-group")!;
        const count = chip.querySelector<HTMLElement>(".count")!;
        const l = label.getBoundingClientRect();
        const c = count.getBoundingClientRect();
        return {
          testId: chip.getAttribute("data-testid"),
          gap: Math.round(c.left - l.right),
          chipWidth: Math.round(chip.getBoundingClientRect().width),
        };
      });
    });

    for (const g of gaps) {
      expect(
        Math.abs(g.gap - EXPECTED_GAP_PX),
        `Chip ${g.testId} (width=${g.chipWidth}px) gap was ${g.gap}px, expected ${EXPECTED_GAP_PX}px ±${GAP_TOLERANCE_PX}px`,
      ).toBeLessThanOrEqual(GAP_TOLERANCE_PX);
    }

    // Screenshot for visual regression review.
    await expect(grid).toHaveScreenshot(`chips-${bp.name}.png`, {
      maxDiffPixelRatio: 0.02,
    });
  });
}
