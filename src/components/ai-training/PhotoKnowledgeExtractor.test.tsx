import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const rows = [
  { id: "p1", url: "https://x.test/gold-front.jpg", url_2: "https://x.test/gold-back.jpg", caption: "Gold Package", srp: "₱7,500" },
];

vi.mock("@/integrations/supabase/client", () => {
  const builder = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.order = () => Promise.resolve({ data: rows, error: null });
    b.then = (res: (v: unknown) => unknown) => res({ count: 1, error: null });
    return b;
  };
  return {
    supabase: {
      from: () => builder(),
      functions: {
        invoke: () =>
          Promise.resolve({
            data: {
              photos: [
                {
                  image_id: "p1",
                  extracted_text: "GOLD PACKAGE ₱7,500\nPure Barley x10 boxes",
                  qa: [
                    { question: "How much is the Gold package?", answer: "The Gold package costs ₱8,500." },
                    { question: "What is in the Gold package?", answer: "It includes 10 boxes of Pure Barley." },
                  ],
                },
              ],
            },
            error: null,
          }),
      },
    },
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PhotoKnowledgeExtractor } from "./PhotoKnowledgeExtractor";

afterEach(cleanup);

describe("PhotoKnowledgeExtractor review", () => {
  it("shows the source photo, back side, listed price and original text beside the drafts", async () => {
    render(<PhotoKnowledgeExtractor existingQuestions={[]} existingCount={0} onSaved={() => {}} />);
    const scan = await screen.findByRole("button", { name: /Scan 1 Packages photos/ });
    fireEvent.click(scan);

    const text = await screen.findByLabelText("Original text read from the photo");
    expect(text.textContent).toContain("Pure Barley x10 boxes");
    expect(screen.getByAltText(/Gold Package — front/).getAttribute("src")).toBe(rows[0].url);
    expect(screen.getByAltText(/Gold Package — back/).getAttribute("src")).toBe(rows[0].url_2);
    expect(screen.getByText("Listed price: ₱7,500")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByLabelText("Answer")).toHaveLength(2));
    // Only the wrong price gets flagged.
    expect(screen.getAllByText(/not found in the photo text/)).toHaveLength(1);
    expect(screen.getByText(/Check 8,500/)).toBeTruthy();
  });
});
