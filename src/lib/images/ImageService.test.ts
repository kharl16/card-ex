import { describe, it, expect } from "vitest";
import { getRenderUrl } from "./ImageService";
const original = "https://example.supabase.co/storage/v1/object/public/media/large.png";
describe("bounded gallery delivery", () => {
  it("optimizes originals with the shared 1200px preset and automatic format negotiation", () => {
    const rendered = new URL(getRenderUrl(original, "product"));
    expect(rendered.pathname).toContain("/render/image/public/");
    expect(rendered.searchParams.get("width")).toBe("1200");
    expect(rendered.searchParams.get("quality")).toBe("82");
    expect(rendered.searchParams.has("format")).toBe(false);
    expect(getRenderUrl(original, "product")).toBe(rendered.href);
  });
  it("reuses already-transformed previews without requesting a second variant", () => {
    const rendered = getRenderUrl(original, "product");
    expect(getRenderUrl(rendered, "product")).toBe(rendered);
  });
  it("leaves external images and optimized avatars untouched", () => {
    expect(getRenderUrl("https://example.com/photo.jpg", "product")).toBe("https://example.com/photo.jpg");
    expect(getRenderUrl(original, "avatar")).toBe(original);
  });
});
