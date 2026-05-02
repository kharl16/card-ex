import { toast } from "sonner";

export interface ShareEverythingInput {
  fullName?: string | null;
  primaryUrl: string;
  altUrl?: string | null;
  referralCode?: string | null;
  slugForFile?: string | null;
}

function buildText({ fullName, primaryUrl, altUrl, referralCode }: ShareEverythingInput) {
  const lines: string[] = [];
  lines.push(`Check out ${fullName ? `${fullName}'s` : "my"} digital business card:`);
  lines.push(primaryUrl);
  if (altUrl && altUrl !== primaryUrl) {
    lines.push(`Alt link: ${altUrl}`);
  }
  if (referralCode) {
    lines.push("");
    lines.push(`Want one too? Sign up with my referral link: https://tagex.app/signup?ref=${referralCode}`);
  }
  return lines.join("\n");
}

export async function shareEverything(input: ShareEverythingInput) {
  const text = buildText(input);
  const title = input.fullName ? `${input.fullName}'s Card` : "My Card";

  // Try to attach QR code image
  let qrFile: File | null = null;
  try {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(input.primaryUrl, { width: 512, margin: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    qrFile = new File([blob], `card-qr-${input.slugForFile || "card"}.png`, { type: "image/png" });
  } catch (e) {
    console.warn("QR generation for share failed:", e);
  }

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const payload: ShareData = { title, text, url: input.primaryUrl };
      if (qrFile && (navigator as any).canShare?.({ files: [qrFile] })) {
        (payload as any).files = [qrFile];
      }
      await (navigator as any).share(payload);
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.warn("Share everything failed:", err);
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Card details copied to clipboard");
  } catch {
    toast.error("Could not share card");
  }
}
