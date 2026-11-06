import { toast } from "sonner";

export type ShareResourceLinkOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Share a saved resource link (Quick Link, etc.).
 *
 * Uses the Web Share API when the browser offers it (phones, tablets, some desktop
 * browsers) and falls back to copying the URL to the clipboard so the action is
 * never a dead end.
 */
export async function shareResourceLink(input: {
  name: string;
  link: string;
}): Promise<ShareResourceLinkOutcome> {
  const { name, link } = input;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: name, url: link });
      return "shared";
    } catch (error) {
      // The person closed the share sheet — nothing else to do.
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
      // Any other failure falls through to the clipboard copy below.
    }
  }

  try {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied — paste it anywhere to share");
    return "copied";
  } catch {
    toast.error("Couldn't share this link");
    return "failed";
  }
}
