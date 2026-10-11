import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddToHomeScreenButton from "./AddToHomeScreenButton";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
});