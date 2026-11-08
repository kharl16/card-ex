import { describe, expect, it } from "vitest";
import { buildDrafts, chunk, normalizeQuestion } from "./photoKnowledge";

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
