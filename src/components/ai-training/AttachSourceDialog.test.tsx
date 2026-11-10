import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const photos: Record<string, unknown[]> = {
  global_package_images: [
    { id: "p-silver", url: "https://x.test/silver.jpg", url_2: null, caption: "Silver Package", srp: "₱3,500" },
    { id: "p-gold", url: "https://x.test/gold.jpg", url_2: null, caption: "Gold Package", srp: "₱7,500" },
  ],
};
const invoke = vi.fn(() =>
  Promise.resolve({ data: { photos: [{ image_id: "p-gold", extracted_text: "GOLD PACKAGE ₱7,500", qa: [] }] }, error: null }),
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.order = () => Promise.resolve({ data: photos[table] ?? [], error: null });
      return b;
    },
    functions: { invoke: (...args: unknown[]) => invoke(...(args as [])) },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AttachSourceDialog } from "./AttachSourceDialog";

afterEach(cleanup);

const item = {
  id: "q1",
  question: "How much is the Gold package?",
  answer: "The Gold package costs ₱8,500.",
  is_active: true,
  unverified_numbers: [],
  numbers_confirmed_at: null,
  source_image_url: null,
  source_extracted_text: null,
  source_image_id: null,
} as never;

describe("AttachSourceDialog", () => {
  it("suggests the matching photo, shows its text for review and saves only after Attach", async () => {
    const onSave = vi.fn(() => Promise.resolve(true));
    render(<AttachSourceDialog item={item} repository={[]} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Attach source photo/ }));

    const gold = await screen.findByRole("button", { name: /Gold Package/ });
    expect(screen.queryByRole("button", { name: /Silver Package/ })).toBeNull();
    fireEvent.click(gold);

    const text = await screen.findByLabelText("Original text read from the photo");
    expect(text.textContent).toContain("GOLD PACKAGE ₱7,500");
    expect(screen.getByText(/Check 8,500/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Attach this photo/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as { source_image_id: string; is_active: boolean };
    expect(patch.source_image_id).toBe("p-gold");
    expect(patch.is_active).toBe(false);
  });
});
