import { describe, expect, it } from "vitest";
import { getDownloadUrl, getEmbedUrl, getShareUrl, parseVideoUrl } from "./videoUtils";

describe("Facebook carousel videos", () => {
  it.each([
    "https://www.facebook.com/Meta/videos/123456789/",
    "https://m.facebook.com/watch/?ref=sharing&v=123456789",
    "https://www.facebook.com/video.php?ref=share&v=123456789",
    "https://www.facebook.com/reel/123456789",
    "https://www.facebook.com/share/v/AbCd123/",
    "https://www.facebook.com/share/r/AbCd123/",
    "https://fb.watch/AbCd123/",
  ])("accepts Facebook video format %s", (url) => {
    expect(parseVideoUrl(url, 2)).toMatchObject({ url, source: "facebook", order: 2 });
    const embed = getEmbedUrl(url, true);
    if (!embed) throw new Error("Missing Facebook embed");
    const parsed = new URL(embed);
    expect(parsed.origin + parsed.pathname).toBe("https://www.facebook.com/plugins/video.php");
    expect(parsed.searchParams.get("autoplay")).toBe("true");
    expect(parsed.searchParams.get("mute")).toBe("1");
    expect(getShareUrl(url)).toBe(url);
    expect(getDownloadUrl(url)).toBeNull();
  });

  it("uses the desktop Facebook address for mobile video embeds", () => {
    const embed = getEmbedUrl("https://m.facebook.com/watch/?v=123456789");
    if (!embed) throw new Error("Missing embed");
    expect(new URL(embed).searchParams.get("href")).toBe("https://www.facebook.com/watch/?v=123456789");
    expect(new URL(embed).searchParams.has("autoplay")).toBe(false);
  });

  it.each([
    "https://www.facebook.com/Meta",
    "https://www.facebook.com/watch/?v=not-a-video",
    "https://fakefacebook.com/reel/123456789",
    "https://facebook.com.evil.example/reel/123456789",
    "not a URL",
  ])("rejects non-video Facebook input %s", (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });

  it("keeps YouTube and Google Drive support", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXc")?.source).toBe("youtube");
    expect(getEmbedUrl("https://youtu.be/dQw4w9WgXc")).toContain("youtube.com/embed/dQw4w9WgXc");
    const drive = "https://drive.google.com/file/d/sample_video_id/view";
    expect(parseVideoUrl(drive)?.source).toBe("gdrive");
    expect(getEmbedUrl(drive)).toBe("https://drive.google.com/file/d/sample_video_id/preview");
    expect(getDownloadUrl(drive)).toBe("https://drive.google.com/uc?export=download&id=sample_video_id");
  });
});