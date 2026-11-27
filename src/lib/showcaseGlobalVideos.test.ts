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

  it("shows global cover photos on every card between its own videos and global videos", () => {
    const own = { url: "https://youtu.be/aaaaaaaaaaa", source: "youtube" as const };
    const cover = {
      url: "https://example.com/cover.jpg",
      thumbnail: "https://example.com/cover-preview.jpg",
      source: "unknown" as const,
      mediaType: "image" as const,
    };
    const globalVideo = { url: "https://youtu.be/bbbbbbbbbbb", source: "youtube" as const };
    const cats = buildShowcaseCategories({ video_items: [own] }, mergeCarouselSettings(null), {
      videos: [cover, globalVideo],
    });
    const category = cats.find((c) => c.key === "videos")!;
    expect(category.videos).toEqual([own, cover, globalVideo]);
    expect(category.count).toBe(3);
  });

  it("makes the Videos carousel visible when a card only has a global cover photo", () => {
    const cover = {
      url: "https://example.com/cover.jpg",
      source: "unknown" as const,
      mediaType: "image" as const,
    };
    const cats = buildShowcaseCategories({}, mergeCarouselSettings(null), { videos: [cover] });
    expect(cats.find((c) => c.key === "videos")!.isVisible).toBe(true);
  });
});
