import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { transpileModule } from "typescript";

// Exercise the actual loader without mounting unrelated dashboard tools.
const source = readFileSync("src/pages/Dashboard.tsx", "utf8");
const start = source.indexOf("  const loadCards = async () => {");
const end = source.indexOf("\n  const openShareDialog", start);
const loader = transpileModule(source.slice(start, end), { compilerOptions: { target: 99 } }).outputText + "\nreturn loadCards;";

function setup(error: unknown, user: { id: string } | null = null) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const replace = vi.fn();
  const setCardsError = vi.fn();
  const setLoading = vi.fn();
  const setCards = vi.fn();
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
  const supabase = { auth: { getUser, signOut }, from: vi.fn(() => query) };
  const run = new Function("supabase", "window", "setLoading", "setCardsError", "viewAsUserId", "setCards", "setCardViewsMap", "toast", loader)(
    supabase, { location: { replace } }, setLoading, setCardsError, null, setCards, vi.fn(), { error: vi.fn() },
  );
  return { run, signOut, replace, setCardsError, setLoading, setCards, getUser, query };
}

describe("Dashboard session recovery", () => {
  it.each([
    { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" },
    { name: "AuthRetryableFetchError", status: 503, message: "Service unavailable" },
    { name: "AuthApiError", status: 500, message: "Unexpected server error" },
  ])("keeps the session and offers retry on temporary failure: $status", async (error) => {
    const state = setup(error);
    await state.run();
    expect(state.signOut).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();
    expect(state.setCardsError).toHaveBeenLastCalledWith(true);
    expect(state.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("loads cards after retrying a temporary failure", async () => {
    const state = setup({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" });
    await state.run();
    state.getUser.mockResolvedValueOnce({ data: { user: { id: "member-1" } }, error: null });
    const cards = [{ id: "card-1", user_id: "member-1", full_name: "Member Card" }];
    state.query.order.mockResolvedValueOnce({ data: cards, error: null });
    // Analytics is independent of loading the recovered cards.
    state.query.select.mockReturnValueOnce(state.query).mockReturnValueOnce({
      in: () => Promise.resolve({ data: [] }),
    });
    await state.run();
    expect(state.setCards).toHaveBeenCalledWith(cards);
    expect(state.setCardsError).toHaveBeenLastCalledWith(false);
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("offers retry without signing out when verification throws", async () => {
    const state = setup(null);
    state.getUser.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await state.run();
      expect(state.signOut).not.toHaveBeenCalled();
      expect(state.replace).not.toHaveBeenCalled();
      expect(state.setCardsError).toHaveBeenLastCalledWith(true);
      expect(state.setLoading).toHaveBeenLastCalledWith(false);
    } finally {
      log.mockRestore();
    }
  });

  it.each([
    { status: 401, message: "Invalid JWT" },
    { status: 403, message: "Forbidden" },
    { status: 400, code: "session_not_found", message: "Session not found" },
    { name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" },
    null,
  ])("redirects only when the session is actually invalid or absent: %j", async (error) => {
    const state = setup(error);
    await state.run();
    expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(state.replace).toHaveBeenCalledWith("/auth?redirect=%2Fdashboard");
  });
});