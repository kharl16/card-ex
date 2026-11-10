import { describe, expect, it } from "vitest";
import { buildSourcePatch, filterRepository, rankPhotoMatches } from "./photoKnowledge";

const source = {
  imageId: "p1",
  url: "https://x.test/gold.jpg",
  url2: null,
  caption: "Gold Package",
  srp: "₱7,500",
  extractedText: "GOLD PACKAGE ₱7,500\nPure Barley x10 boxes",
};

describe("repository review filters", () => {
  const rows = [
    { id: "held", unverified_numbers: ["8,500"], numbers_confirmed_at: null, source_image_url: "u", source_extracted_text: "t" },
    { id: "confirmed", unverified_numbers: ["8,500"], numbers_confirmed_at: "2026-11-10", source_image_url: "u", source_extracted_text: "t" },
    { id: "old", unverified_numbers: [], numbers_confirmed_at: null, source_image_url: null, source_extracted_text: null },
  ];

  it("On hold shows only answers with unconfirmed flagged numbers", () => {
    expect(filterRepository(rows, "held").map((r) => r.id)).toEqual(["held"]);
  });

  it("No source photo shows only answers without a linked photo", () => {
    expect(filterRepository(rows, "unsourced").map((r) => r.id)).toEqual(["old"]);
  });
});

describe("attaching a source photo to an older answer", () => {
  it("suggests the photo whose name matches the answer first", () => {
    const ranked = rankPhotoMatches(
      { question: "What is in the Gold package?", answer: "10 boxes of Pure Barley." },
      [
        { id: "a", caption: "Silver Package" },
        { id: "b", caption: "Gold Package" },
      ],
    );
    expect(ranked[0].photo.id).toBe("b");
  });

  it("puts the answer on hold when its price is not on the new photo", () => {
    const patch = buildSourcePatch({ answer: "The Gold package costs ₱8,500.", is_active: true }, source, "packages", null);
    expect(patch.unverified_numbers).toEqual(["8,500"]);
    expect(patch.numbers_confirmed_at).toBeNull();
    expect(patch.is_active).toBe(false);
  });

  it("keeps it live when the admin confirms the flagged price", () => {
    const patch = buildSourcePatch(
      { answer: "The Gold package costs ₱8,500.", is_active: true },
      source,
      "packages",
      "8,500",
      "2026-11-11T00:00:00Z",
    );
    expect(patch.numbers_confirmed_at).toBe("2026-11-11T00:00:00Z");
    expect(patch.is_active).toBe(true);
  });

  it("never carries over a confirmation made for a different photo", () => {
    const patch = buildSourcePatch(
      { answer: "The Gold package costs ₱8,500.", is_active: true, unverified_numbers: ["8,500"], numbers_confirmed_at: "2026-11-01" },
      source,
      "packages",
      null,
    );
    expect(patch.numbers_confirmed_at).toBeNull();
    expect(patch.is_active).toBe(false);
  });

  it("releases a held answer when every number appears on the correct photo", () => {
    const patch = buildSourcePatch(
      { answer: "The Gold package costs ₱7,500.", is_active: false, unverified_numbers: ["7,500"], numbers_confirmed_at: null },
      source,
      "packages",
      null,
    );
    expect(patch.unverified_numbers).toEqual([]);
    expect(patch.is_active).toBe(true);
    expect(patch.source_extracted_text).toBe(source.extractedText);
  });
});
