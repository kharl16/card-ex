import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddToHomeScreenButton from "./AddToHomeScreenButton";

afterEach(() => {
  cleanup();
  // A fresh install-availability signal clears session detection between tests.
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome: "dismissed" }) });
  window.dispatchEvent(event);
  vi.restoreAllMocks();
});

describe("home-screen installation", () => {
  it("opens the native prompt once from the dashboard action", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    window.dispatchEvent(event);
    render(<AddToHomeScreenButton label="Install Card-Ex" variant="outline" />);
    fireEvent.click(screen.getByRole("button", { name: "Install Card-Ex" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Install Card-Ex" }));
    expect(screen.getByText(/Choose/)).toBeInTheDocument();
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("shows Safari steps when iPhone has no native prompt", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone Safari");
    render(<AddToHomeScreenButton label="Install Card-Ex" />);
    fireEvent.click(screen.getByRole("button", { name: "Install Card-Ex" }));
    expect(screen.getByText(/at the bottom of Safari/)).toBeInTheDocument();
  });

  it("hides the action after installation", () => {
    render(<AddToHomeScreenButton label="Install Card-Ex" />);
    fireEvent(window, new Event("appinstalled"));
    expect(screen.queryByRole("button", { name: "Install Card-Ex" })).not.toBeInTheDocument();
  });

  it("shows the action again when the browser offers installation after removal", () => {
    render(<AddToHomeScreenButton label="Install Card-Ex" floating />);
    fireEvent(window, new Event("appinstalled"));
    expect(screen.queryByRole("button", { name: "Install Card-Ex" })).not.toBeInTheDocument();
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "dismissed" }) });
    fireEvent(window, event);
    expect(screen.getByRole("button", { name: "Install Card-Ex" })).toBeInTheDocument();
  });

  it("stays hidden when the shared control remounts after installation", () => {
    const { unmount } = render(<AddToHomeScreenButton label="Install Card-Ex" floating />);
    fireEvent(window, new Event("appinstalled"));
    unmount();
    render(<AddToHomeScreenButton label="Install Card-Ex" floating />);
    expect(screen.queryByRole("button", { name: "Install Card-Ex" })).not.toBeInTheDocument();
  });

  it("hides when opened from an installed standalone app", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)", media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(),
      removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    render(<AddToHomeScreenButton label="Install Card-Ex" floating />);
    expect(screen.queryByRole("button", { name: "Install Card-Ex" })).not.toBeInTheDocument();
  });
});