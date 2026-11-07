import { describe, it, expect } from "vitest";
import { scaleQrFrame } from "./QRActionRow";

const framed = { frameEnabled: true, framePadding: 16, frameWidth: 4, frameBorderRadius: 12 };

describe("scaleQrFrame", () => {
  it("keeps the saved frame at full size on laptop-sized tiles", () => {
    const { settings, qrSize } = scaleQrFrame(200, framed);
    expect(settings.framePadding).toBe(16);
    expect(settings.frameWidth).toBe(4);
    expect(qrSize).toBe(200 - 12 - 40);
  });

  it("lets the QR fill a similar share of a small phone tile", () => {
    const { qrSize } = scaleQrFrame(110, framed);
    // At least ~70% of the tile, matching the laptop proportion.
    expect(qrSize / 110).toBeGreaterThanOrEqual(0.7);
  });
});
