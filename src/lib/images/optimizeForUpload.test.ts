import { describe, expect, it } from "vitest";
import { detectWhiteEdgeCrop } from "./optimizeForUpload";

function pixels(width: number, height: number, color = 20) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color;
    data[i + 1] = color;
    data[i + 2] = color;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function paintWhite(image: ReturnType<typeof pixels>, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * image.width + x) * 4;
      image.data[i] = 250;
      image.data[i + 1] = 250;
      image.data[i + 2] = 250;
    }
  }
}

describe("detectWhiteEdgeCrop", () => {
  it("removes left and right edge bands", () => {
    const image = pixels(100, 60);
    paintWhite(image, 0, 0, 8, 60);
    paintWhite(image, 92, 0, 100, 60);
    expect(detectWhiteEdgeCrop(image)).toEqual({ x: 7, y: 0, width: 86, height: 60 });
  });

  it("removes four-sided edge bands", () => {
    const image = pixels(100, 100);
    paintWhite(image, 0, 0, 100, 6);
    paintWhite(image, 0, 94, 100, 100);
    paintWhite(image, 0, 0, 6, 100);
    paintWhite(image, 94, 0, 100, 100);
    expect(detectWhiteEdgeCrop(image)).toEqual({ x: 5, y: 5, width: 90, height: 90 });
  });

  it("keeps an already edge-to-edge page unchanged", () => {
    expect(detectWhiteEdgeCrop(pixels(80, 60))).toEqual({ x: 0, y: 0, width: 80, height: 60 });
  });

  it("does not remove an intentional white area that does not fill an edge", () => {
    const image = pixels(100, 60);
    paintWhite(image, 0, 10, 20, 50);
    expect(detectWhiteEdgeCrop(image)).toEqual({ x: 0, y: 0, width: 100, height: 60 });
  });
});