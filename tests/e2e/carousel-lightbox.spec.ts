import { test, expect, type Locator } from "@playwright/test";

const FIXTURE = "/test-fixtures/carousel-lightbox.html";

/**
 * Assert that an <img>'s rendered content box is entirely contained within
 * its wrapper (no cropping) and that with object-fit: contain the image
 * preserves its natural aspect ratio to within 1px.
 */
async function expectUncropped(img: Locator, wrapper: Locator) {
  const [imgBox, wrapBox, natural] = await Promise.all([
    img.boundingBox(),
    wrapper.boundingBox(),
    img.evaluate((el: HTMLImageElement) => ({
      w: el.naturalWidth,
      h: el.naturalHeight,
    })),
  ]);
  if (!imgBox || !wrapBox) throw new Error("missing bounding box");

  // Image never overflows wrapper (allow 1px sub-pixel slack).
  expect(imgBox.width).toBeLessThanOrEqual(wrapBox.width + 1);
  expect(imgBox.height).toBeLessThanOrEqual(wrapBox.height + 1);

  // With object-contain the rendered aspect ratio must equal natural.
  const naturalAspect = natural.w / natural.h;
  const wrapAspect = wrapBox.width / wrapBox.height;
  // The wrapper we compare against is the *contain* box, which for a square
  // slide fits by the longer axis; compute the effective contained size.
  const contained =
    naturalAspect >= wrapAspect
      ? { w: wrapBox.width, h: wrapBox.width / naturalAspect }
      : { w: wrapBox.height * naturalAspect, h: wrapBox.height };

  // Rendered image must match the contained size (uncropped fit).
  expect(Math.abs(imgBox.width - contained.w)).toBeLessThanOrEqual(1);
  expect(Math.abs(imgBox.height - contained.h)).toBeLessThanOrEqual(1);
}

test.describe("Carousel + Lightbox uncropped rendering", () => {
  test("no horizontal overflow at this viewport", async ({ page }) => {
    await page.goto(FIXTURE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  const aspectLabels = [
    "portrait-tall",
    "square",
    "landscape-wide",
    "ultra-tall",
    "ultra-wide",
  ] as const;

  for (const label of aspectLabels) {
    test(`carousel slide "${label}" renders fully uncropped`, async ({ page }) => {
      await page.goto(FIXTURE);
      const slide = page.locator(`[data-testid="carousel-slide"][data-label="${label}"]`);
      await expect(slide).toBeVisible();
      const img = slide.locator("img");
      await expect(img).toHaveJSProperty("complete", true);
      await expectUncropped(img, slide);
    });

    test(`lightbox for "${label}" renders fully uncropped and fits viewport`, async ({
      page,
    }) => {
      await page.goto(FIXTURE);
      await page
        .locator(`[data-testid="carousel-slide"][data-label="${label}"]`)
        .click();
      const lb = page.getByTestId("lightbox");
      await expect(lb).toHaveClass(/open/);

      const wrapper = page.getByTestId("lightbox-wrapper");
      const img = page.getByTestId("lightbox-image");
      await expect(img).toHaveJSProperty("complete", true);

      // Wrapper honours the 95vw/95vh - 4rem caps.
      const [wrapBox, viewport] = await Promise.all([
        wrapper.boundingBox(),
        page.viewportSize(),
      ]);
      if (!wrapBox || !viewport) throw new Error("missing box/viewport");
      const rem = 16;
      expect(wrapBox.width).toBeLessThanOrEqual(viewport.width * 0.95 - 4 * rem + 1);
      expect(wrapBox.height).toBeLessThanOrEqual(viewport.height * 0.95 - 4 * rem + 1);

      await expectUncropped(img, wrapper);
    });
  }
});
