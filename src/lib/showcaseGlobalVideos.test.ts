import { describe, it, expect } from "vitest";
import { buildShowcaseCategories } from "./showcase";
import { mergeCarouselSettings } from "./carouselTypes";

describe("global videos", () => {
  it("appear on a card with no videos of its own", () => {
    const cats = buildShowcaseCategories({}, mergeCarouselSettings(null), {
      videos: [{ url: "https://youtu.be/abcdefghijk", source: "youtube" }],
    });
    expect(cats.find((c) => c.key === "videos")!.count).toBe(1);
  });
  it("follow the card's own videos without duplicates", () => {
    const own = { url: "https://youtu.be/aaaaaaaaaaa", source: "youtube" };
    const cats = buildShowcaseCategories({ video_items: [own] }, mergeCarouselSettings(null), {
      videos: [own as any, { url: "https://youtu.be/bbbbbbbbbbb", source: "youtube" }],
    });
    const v = cats.find((c) => c.key === "videos")!.videos.map((x) => x.url);
    expect(v).toEqual(["https://youtu.be/aaaaaaaaaaa", "https://youtu.be/bbbbbbbbbbb"]);
  });
});
