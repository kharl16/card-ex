import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, Gift } from "lucide-react";
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

  const title = fullName ? `${fullName}'s Card` : "My Card";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card
          </DialogTitle>
          <DialogDescription>
            Share the link, QR code, and your referral link — all in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Button
            onClick={shareAll}
            className="w-full h-12 gap-2 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 text-primary-foreground font-semibold shadow-lg"
          >
            <Share2 className="h-5 w-5" />
            Share Everything (Link + QR + Referral)
          </Button>

          {/* Custom / Primary URL */}
          <div className="space-y-2">
            <Label>Card URL</Label>
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
              <Label>Alternate URL</Label>
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

          {/* QR Code */}
          <div className="space-y-2">
            <Label>QR Code</Label>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4 bg-card">
              <QRCodeDisplay
                url={primaryUrl}
                settings={qrSettings}
                size={192}
                showDownload
                showShare
                shareTitle={title}
                shareText="Scan this QR to view my digital business card"
                downloadFileName={`card-ex-${slugForFile || "card"}`}
              />
            </div>
          </div>

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
                Share this link to invite others and earn rewards when they sign up.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
