import { describe, it, expect, vi, afterEach } from "vitest";
import { shareResourceLink } from "./shareResourceLink";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const link = { name: "IAM AI Tools", link: "https://iamhypertools.lovable.app/" };

describe("shareResourceLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shares through the Web Share API when the browser offers it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    const outcome = await shareResourceLink(link);

    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "IAM AI Tools",
      url: "https://iamhypertools.lovable.app/",
    });
  });

  it("copies the URL to the clipboard when the browser has no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const outcome = await shareResourceLink(link);

    expect(outcome).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://iamhypertools.lovable.app/");
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it("still copies when opening the share sheet fails for a reason other than cancelling", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new Error("not allowed")),
      clipboard: { writeText },
    });

    const outcome = await shareResourceLink(link);

    expect(outcome).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://iamhypertools.lovable.app/");
  });

  it("leaves things alone when the person closes the share sheet", async () => {
    const writeText = vi.fn();
    const abort = new Error("dismissed");
    abort.name = "AbortError";
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(abort),
      clipboard: { writeText },
    });

    const outcome = await shareResourceLink(link);

    expect(outcome).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports a failure when the clipboard is unavailable too", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const outcome = await shareResourceLink(link);

    expect(outcome).toBe("failed");
    expect(vi.mocked(toast.error)).toHaveBeenCalled();
  });
});
