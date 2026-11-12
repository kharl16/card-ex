import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const session = { user: { id: "member-1" } };
const cardLookup = { data: { id: "card-9" } as { id: string } | null, error: null };
const query = {
  select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve(cardLookup)),
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => query),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import Auth from "./Auth";

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function renderAt(url: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("signing in from the emailed Activate Plan link", () => {
  beforeEach(() => sessionStorage.clear());

  it("lands on that card's payment page after sign-in", async () => {
    const { findByTestId } = renderAt("/auth?redirect=%2Fbilling%2Fcard-9");
    expect((await findByTestId("where")).textContent).toBe("/billing/card-9");
  });

  it("lands on the member's card page when no page was requested", async () => {
    const { findByTestId } = renderAt("/auth");
    await waitFor(async () => expect((await findByTestId("where")).textContent).toBe("/cards/card-9/edit"));
  });

  it("ignores links that point outside Card-Ex", async () => {
    const { findByTestId } = renderAt("/auth?redirect=https%3A%2F%2Fevil.example%2Fbilling");
    await waitFor(async () => expect((await findByTestId("where")).textContent).toBe("/cards/card-9/edit"));
  });
});
