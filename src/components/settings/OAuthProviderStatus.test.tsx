import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { OAuthProviderStatus } from "./OAuthProviderStatus";

const auth = vi.hoisted(() => ({
  isPermanentSuperAdmin: false,
  isSuperAdmin: false,
  loading: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.assign(auth, { isPermanentSuperAdmin: false, isSuperAdmin: false, loading: false });
});

describe("owner-only Google setup", () => {
  it("hides the panel and does not fetch settings for other admins", () => {
    auth.isSuperAdmin = true;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<OAuthProviderStatus />);
    expect(container.childElementCount).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hides the panel until the owner's super-admin role is resolved", () => {
    auth.isPermanentSuperAdmin = true;
    const { container } = render(<OAuthProviderStatus />);
    expect(container.childElementCount).toBe(0);
  });

  it("hides the panel for signed-out visitors", () => {
    const { container } = render(<OAuthProviderStatus />);
    expect(container.childElementCount).toBe(0);
  });

  it("shows the mobile screenshot's production URLs to the owner even on localhost", async () => {
    Object.assign(auth, { isPermanentSuperAdmin: true, isSuperAdmin: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external: { google: true } }),
    }));
    const { container } = render(<OAuthProviderStatus />);
    await waitFor(() => expect(container.textContent).toContain("https://www.tagex.app"));
    expect(container.textContent).toContain("https://tagex.app/auth/callback");
    expect(container.textContent).toContain(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`);
    expect(container.textContent).not.toContain("localhost");
    expect(container.textContent).not.toContain("https://www.id-preview");
  });
});