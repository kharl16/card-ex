import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, Gift, Link as LinkIcon, CopyCheck } from "lucide-react";
import { toast } from "sonner";
import QRCodeDisplay, { type QRDisplaySettings } from "@/components/qr/QRCodeDisplay";
import { shareEverything } from "@/lib/shareEverything";

interface CardShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName?: string | null;
  /** Primary public URL (custom slug if available, else /c/ url) */
  primaryUrl: string;
  /** Optional alt URL (e.g. standard /c/ url when primary is custom) */
  altUrl?: string | null;
  referralCode?: string | null;
  qrSettings?: QRDisplaySettings;
  slugForFile?: string | null;
}

export default function CardShareDialog({
  open,
  onOpenChange,
  fullName,
  primaryUrl,
  altUrl,
  referralCode,
  qrSettings,
  slugForFile,
}: CardShareDialogProps) {
  const referralLink = referralCode ? `https://tagex.app/signup?ref=${referralCode}` : null;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`✅ Copied: ${label}`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareUrl = async (url: string, title: string, text: string) => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    await copy(url, title);
  };

  const shareAll = () =>
    shareEverything({
      fullName,
      primaryUrl,
      altUrl: altUrl || null,
      referralCode: referralCode || null,
      slugForFile: slugForFile || null,
    });

  const buildAllText = () => {
    const lines: string[] = [];
    lines.push(`Check out ${fullName ? `${fullName}'s` : "my"} digital business card:`);
    lines.push(primaryUrl);
    if (altUrl && altUrl !== primaryUrl) lines.push(`Alt link: ${altUrl}`);
    if (referralLink) {
      lines.push("");
      lines.push(`Want one too? Sign up with my referral link: ${referralLink}`);
    }
    return lines.join("\n");
  };

  const copyAll = async () => {
    const text = buildAllText();
    // Try to copy QR image + text together using ClipboardItem (Chrome/Edge support image/png)
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(primaryUrl, { width: 512, margin: 2 });
      const pngBlob = await (await fetch(dataUrl)).blob();
      const textBlob = new Blob([text], { type: "text/plain" });
      // @ts-ignore - ClipboardItem may not be in TS lib
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        // @ts-ignore
        await navigator.clipboard.write([
          // @ts-ignore
          new ClipboardItem({ "image/png": pngBlob, "text/plain": textBlob }),
        ]);
        toast.success("✅ Copied URL, QR image & referral link");
        return;
      }
    } catch (e) {
      console.warn("Copy with image failed, falling back to text:", e);
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("✅ Copied URL & referral link (QR image not supported here)");
    } catch {
      toast.error("Could not copy");
    }
  };

  const title = fullName ? `${fullName}'s Card` : "My Card";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card
          </DialogTitle>
          <DialogDescription>
            Share the link, QR code, and referral — all from one place.
          </DialogDescription>
        </DialogHeader>

        {/* Sticky QR header — always visible */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/95 backdrop-blur px-6 py-4 border-b border-border/40">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card p-3">
            <QRCodeDisplay
              url={primaryUrl}
              settings={qrSettings}
              size={160}
              showDownload
              showShare
              shareTitle={title}
              shareText="Scan this QR to view my digital business card"
              downloadFileName={`card-ex-${slugForFile || "card"}`}
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Scan, download, or share this QR
            </p>
          </div>

          <Button
            onClick={shareAll}
            className="w-full h-11 mt-3 gap-2 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 text-primary-foreground font-semibold shadow-lg"
          >
            <Share2 className="h-4 w-4" />
            Share Everything (Link + QR + Referral)
          </Button>
        </div>

        {/* Scrollable content for individual links */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Primary URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              Card URL
            </Label>
            <div className="flex gap-2">
              <Input value={primaryUrl} readOnly className="flex-1 font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copy(primaryUrl, "Card URL")} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => shareUrl(primaryUrl, title, "Check out my digital business card")}
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {altUrl && altUrl !== primaryUrl && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4" />
                Alternate URL
              </Label>
              <div className="flex gap-2">
                <Input value={altUrl} readOnly className="flex-1 font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copy(altUrl, "Alternate URL")} title="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => shareUrl(altUrl, title, "Check out my digital business card")}
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Referral */}
          {referralLink && (
            <div className="space-y-2 rounded-lg border border-[hsl(var(--primary))]/30 bg-gradient-to-r from-[hsl(var(--primary))]/10 to-transparent p-3">
              <Label className="flex items-center gap-1.5 text-[hsl(var(--primary))]">
                <Gift className="h-4 w-4" />
                Referral Link
              </Label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="flex-1 font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(referralLink, "Referral link")}
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() =>
                    shareUrl(
                      referralLink,
                      "Join Card-Ex by Tagex.app",
                      "Sign up using my referral link to get started!"
                    )
                  }
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Invite others and earn rewards when they sign up.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
