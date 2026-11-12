import { beforeEach, describe, expect, it, vi } from "vitest";

const result = { data: null as { id: string } | null, error: null as { message: string } | null };
const query = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve(result)),
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => query) } }));

import { resolveSignInDestination } from "./authDestination";

const user = { id: "user-1" } as never;

describe("where members land after signing in", () => {
  beforeEach(() => {
    result.data = null;
    result.error = null;
  });

  it("opens the member's own card page instead of the Dashboard", async () => {
    result.data = { id: "card-9" };
    expect(await resolveSignInDestination(user, "/dashboard")).toBe("/cards/card-9/edit");
    expect(query.eq).toHaveBeenCalledWith("is_template", false);
  });

  it("sends members without a card to setup", async () => {
    expect(await resolveSignInDestination(user, "/dashboard")).toBe("/onboarding");
  });

  it("keeps a specific page the member was trying to open, like plan activation", async () => {
    result.data = { id: "card-9" };
    expect(await resolveSignInDestination(user, "/billing/card-9")).toBe("/billing/card-9");
  });

  it("falls back to the Dashboard if the card lookup fails", async () => {
    result.error = { message: "network" };
    expect(await resolveSignInDestination(user, "/dashboard")).toBe("/dashboard");
  });
});
