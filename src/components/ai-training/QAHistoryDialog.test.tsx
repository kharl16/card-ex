import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const base = {
  qa_id: "q1",
  card_id: null,
  actor_id: "u1",
  actor_name: "Carl Tamayao",
  question: "How much is Copper?",
  answer: "₱5,600",
  previous_question: null,
  previous_answer: null,
  source_category: "packages",
  source_image_id: null,
  source_image_url: "https://x.test/new.jpg",
  source_caption: "Amazing Smile",
  previous_source_image_url: null,
  previous_source_caption: null,
  is_active: false,
  unverified_numbers: ["5,600"],
  hold_reason: null,
  numbers_confirmed_at: null,
  numbers_confirmed_by: null,
  confirmed_by_name: null,
  note: null,
};
const rows = [
  { ...base, id: "h2", events: ["confirmed"], created_at: "2026-11-11T03:40:00Z", is_active: true,
    numbers_confirmed_at: "2026-11-11T03:40:00Z", numbers_confirmed_by: "u1", confirmed_by_name: "Carl Tamayao" },
  { ...base, id: "h1", events: ["source_changed", "put_on_hold"], created_at: "2026-11-11T03:30:00Z",
    previous_source_image_url: "https://x.test/old.jpg", previous_source_caption: "Copper",
    hold_reason: "5,600 was not found on the source photo after the source photo was changed" },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.order = () => Promise.resolve({ data: rows, error: null });
      return b;
    },
  },
}));

import { QAHistoryDialog, formatHistoryTime } from "./QAHistoryDialog";

afterEach(cleanup);

describe("QAHistoryDialog", () => {
  it("shows who confirmed a version and when", async () => {
    render(<QAHistoryDialog qaId="q1" />);
    fireEvent.click(screen.getByRole("button", { name: /history/i }));
    const confirmed = await screen.findByText(/This version confirmed by/);
    expect(confirmed.textContent).toContain("Carl Tamayao");
    expect(confirmed.textContent).toContain(formatHistoryTime("2026-11-11T03:40:00Z"));
  });

  it("shows the hold reason and the photo the answer moved from", async () => {
    render(<QAHistoryDialog qaId="q1" />);
    fireEvent.click(screen.getByRole("button", { name: /history/i }));
    expect(await screen.findByText(/5,600 was not found on the source photo/)).toBeTruthy();
    expect(screen.getByText("Copper")).toBeTruthy();
    expect(screen.getAllByText("Amazing Smile").length).toBeGreaterThan(0);
  });
});
