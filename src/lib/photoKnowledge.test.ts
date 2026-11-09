import { describe, expect, it } from "vitest";
import { buildDrafts, chunk, findUnverifiedNumbers, isOnHold, normalizeQuestion, numbersKey, toRepositoryRow } from "./photoKnowledge";

describe("photo knowledge drafts", () => {
  it("batches photos into groups of at most 3", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("flags questions already in the repository and leaves them unselected", () => {
    const drafts = buildDrafts(
      [{ image_id: "a", qa: [
        { question: "How much is the Gold package?", answer: "₱50,000" },
        { question: "What is in the Gold package?", answer: "Barley x10" },
      ] }],
      ["how much is the gold package"],
    );
    expect(drafts.map((d) => [d.duplicate, d.selected])).toEqual([[true, false], [false, true]]);
  });

  it("flags a question repeated across photos in the same scan", () => {
    const drafts = buildDrafts(
      [
        { image_id: "a", qa: [{ question: "What is Pure Barley?", answer: "A juice drink." }] },
        { image_id: "b", qa: [{ question: "what is pure barley", answer: "Organic barley." }] },
      ],
      [],
    );
    expect(drafts[1].duplicate).toBe(true);
    expect(drafts[1].selected).toBe(false);
  });

  it("drops pairs with an empty answer", () => {
    expect(buildDrafts([{ image_id: "a", qa: [{ question: "Q?", answer: "  " }] }], [])).toHaveLength(0);
  });

  it("normalizes punctuation and case", () => {
    expect(normalizeQuestion("  What's  the PRICE?! ")).toBe("what s the price");
  });
});

describe("answer numbers vs photo text", () => {
  it("flags a price in the answer that is not on the photo", () => {
    expect(findUnverifiedNumbers("The Gold package costs ₱8,500.", "GOLD PACKAGE ₱7,500 includes 10 boxes")).toEqual([
      "8,500",
    ]);
  });

  it("accepts prices written with or without commas and decimals", () => {
    expect(findUnverifiedNumbers("It costs ₱7500.00 and has 10 boxes.", "GOLD ₱7,500 — 10 boxes")).toEqual([]);
  });

  it("flags quantities that differ from the photo", () => {
    expect(findUnverifiedNumbers("Includes 12 boxes of Pure Barley.", "Pure Barley x10 boxes")).toEqual(["12"]);
  });
});

describe("saving photo Q&A to the repository", () => {
  const source = {
    imageId: "img-1",
    url: "https://example.com/gold.jpg",
    url2: "https://example.com/gold-back.jpg",
    caption: "Gold Package",
    srp: "₱7,500",
    extractedText: "GOLD PACKAGE includes 10 boxes",
  };
  const draft = (answer: string, confirmedFor: string | null = null) => ({
    key: "k",
    imageId: "img-1",
    question: "How much is Gold?",
    answer,
    selected: true,
    duplicate: false,
    confirmedFor,
  });

  it("saves an unconfirmed answer with an unverified price on hold, out of the chatbot", () => {
    const row = toRepositoryRow(draft("It costs ₱8,500."), source, "packages", 0);
    expect(row.is_active).toBe(false);
    expect(row.unverified_numbers).toEqual(["8,500"]);
    expect(row.numbers_confirmed_at).toBeNull();
    expect(isOnHold(row)).toBe(true);
  });

  it("puts an answer live only after its exact flagged numbers are confirmed", () => {
    const row = toRepositoryRow(draft("It costs ₱8,500.", numbersKey(["8,500"])), source, "packages", 0, "2026-11-09T00:00:00Z");
    expect(row.is_active).toBe(true);
    expect(row.numbers_confirmed_at).toBe("2026-11-09T00:00:00Z");
    expect(isOnHold(row)).toBe(false);
  });

  it("ignores a confirmation given for different numbers after the answer was edited", () => {
    const row = toRepositoryRow(draft("It costs ₱9,000.", numbersKey(["8,500"])), source, "packages", 0);
    expect(row.is_active).toBe(false);
  });

  it("saves answers whose numbers match the photo live without asking", () => {
    const row = toRepositoryRow(draft("It costs ₱7,500 for 10 boxes."), source, "packages", 0);
    expect(row.is_active).toBe(true);
    expect(row.unverified_numbers).toEqual([]);
  });

  it("keeps the source photo and its original text with the saved answer", () => {
    const row = toRepositoryRow(draft("It costs ₱7,500."), source, "packages", 3);
    expect(row).toMatchObject({
      source_category: "packages",
      source_image_id: "img-1",
      source_image_url: "https://example.com/gold.jpg",
      source_image_url_2: "https://example.com/gold-back.jpg",
      source_caption: "Gold Package",
      source_srp: "₱7,500",
      source_extracted_text: "GOLD PACKAGE includes 10 boxes",
      sort_order: 3,
    });
  });
});
