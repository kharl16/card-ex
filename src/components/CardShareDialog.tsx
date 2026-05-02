import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, Gift, Link as LinkIcon, CopyCheck } from "lucide-react";
import { toast } from "sonner";
import QRCodeDisplay, { type QRDisplaySettings } from "@/components/qr/QRCodeDisplay";
import { shareEverything } from "@/lib/shareEverything";
import { supabase } from "@/integrations/supabase/client";

interface CardShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Card id is required for tracking analytics. If omitted, dialog still works without tracking. */
  cardId?: string | null;
  fullName?: string | null;
  /** Primary public URL (custom slug if available, else /c/ url) */
  primaryUrl: string;
  /** Optional alt URL (e.g. standard /c/ url when primary is custom) */
  altUrl?: string | null;
  referralCode?: string | null;
  qrSettings?: QRDisplaySettings;
  slugForFile?: string | null;
}

type ActionKey =
  | "url_copy"
  | "url_share"
  | "alt_copy"
  | "alt_share"
  | "referral_copy"
  | "referral_share"
  | "copy_all"
  | "share_all";

const ACTION_LABELS: Record<ActionKey, string> = {
  url_copy: "Card URL copied",
  url_share: "Card URL shared",
  alt_copy: "Alt URL copied",
  alt_share: "Alt URL shared",
  referral_copy: "Referral copied",
  referral_share: "Referral shared",
  copy_all: "Copy all",
  share_all: "Share all",
};

const sessionKey = (cardId: string | null | undefined, key: ActionKey) =>
  `cex_share_count:${cardId || "anon"}:${key}`;

function getCount(cardId: string | null | undefined, key: ActionKey): number {
  try {
    return Number(localStorage.getItem(sessionKey(cardId, key)) || "0") || 0;
  } catch {
    return 0;
  }
}

function bumpCount(cardId: string | null | undefined, key: ActionKey): number {
  try {
    const next = getCount(cardId, key) + 1;
    localStorage.setItem(sessionKey(cardId, key), String(next));
    return next;
  } catch {
    return 0;
  }
}

export default function CardShareDialog({
  open,
  onOpenChange,
  cardId,
  fullName,
  primaryUrl,
  altUrl,
  referralCode,
  qrSettings,
  slugForFile,
}: CardShareDialogProps) {
  const referralLink = referralCode ? `https://tagex.app/signup?ref=${referralCode}` : null;

  // Per-action local counts (this device)
  const [counts, setCounts] = useState<Record<ActionKey, number>>(() => ({
    url_copy: 0,
    url_share: 0,
    alt_copy: 0,
    alt_share: 0,
    referral_copy: 0,
    referral_share: 0,
    copy_all: 0,
    share_all: 0,
  }));

  // Lifetime CTA totals fetched from analytics_daily
  const [lifetimeCta, setLifetimeCta] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Refresh both local counts and lifetime totals when dialog opens
  useEffect(() => {
    if (!open) return;

    // Reload local counts from storage
    setCounts({
      url_copy: getCount(cardId, "url_copy"),
      url_share: getCount(cardId, "url_share"),
      alt_copy: getCount(cardId, "alt_copy"),
      alt_share: getCount(cardId, "alt_share"),
      referral_copy: getCount(cardId, "referral_copy"),
      referral_share: getCount(cardId, "referral_share"),
      copy_all: getCount(cardId, "copy_all"),
      share_all: getCount(cardId, "share_all"),
    });

    // Fetch lifetime CTA totals
    if (!cardId) return;
    setLoadingStats(true);
    supabase
      .from("analytics_daily")
      .select("cta_clicks")
      .eq("card_id", cardId)
      .then(({ data, error }) => {
        if (error) {
          console.warn("Failed to fetch share analytics:", error);
          setLifetimeCta(null);
        } else {
          const sum = (data || []).reduce((acc, r) => acc + (r.cta_clicks || 0), 0);
          setLifetimeCta(sum);
        }
        setLoadingStats(false);
      });
  }, [open, cardId]);

  const track = (key: ActionKey) => {
    // Update session count immediately
    bumpCount(cardId, key);
    setCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));

    // Fire-and-forget server-side cta_click event
    if (cardId) {
      supabase.functions
        .invoke("track-card-event", {
          body: { card_id: cardId, kind: "cta_click", source: `share_dialog:${key}` },
        })
        .then(() => {
          // Optimistic local bump of lifetime total
          setLifetimeCta((prev) => (prev == null ? prev : prev + 1));
        })
        .catch((e) => console.warn("track share event failed", e));
    }
  };

  const copy = async (value: string, label: string, key: ActionKey) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`✅ Copied: ${label}`);
      track(key);
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareUrlAction = async (url: string, t: string, text: string, key: ActionKey) => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: t, text, url });
        track(key);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    // Fallback: copy
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      track(key);
    } catch {
      toast.error("Could not share");
    }
  };

  const shareAll = async () => {
    await shareEverything({
      fullName,
      primaryUrl,
      altUrl: altUrl || null,
      referralCode: referralCode || null,
      slugForFile: slugForFile || null,
    });
    track("share_all");
  };

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
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(primaryUrl, { width: 512, margin: 2 });
      const pngBlob = await (await fetch(dataUrl)).blob();
      const textBlob = new Blob([text], { type: "text/plain" });
      // @ts-ignore
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        // @ts-ignore
        await navigator.clipboard.write([
          // @ts-ignore
          new ClipboardItem({ "image/png": pngBlob, "text/plain": textBlob }),
        ]);
        toast.success("✅ Copied URL, QR image & referral link");
        track("copy_all");
        return;
      }
    } catch (e) {
      console.warn("Copy with image failed, falling back to text:", e);
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("✅ Copied URL & referral link (QR image not supported here)");
      track("copy_all");
    } catch {
      toast.error("Could not copy");
    }
  };

  const title = fullName ? `${fullName}'s Card` : "My Card";

  // Aggregate per-action counts for display
  const cardUrlActions = counts.url_copy + counts.url_share;
  const referralActions = counts.referral_copy + counts.referral_share;
  const totalActions =
    counts.url_copy +
    counts.url_share +
    counts.alt_copy +
    counts.alt_share +
    counts.referral_copy +
    counts.referral_share +
    counts.copy_all +
    counts.share_all;

  const Badge = ({ value, label }: { value: number; label: string }) =>
    value > 0 ? (
      <span
        className="ml-1 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))]/15 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--primary))]"
        title={label}
      >
        {value}
      </span>
    ) : null;

  // Swipe-to-close (mobile): vertical drag down on the dialog closes it.
  const swipeRef = useRef<{ startY: number; startX: number; dy: number; active: boolean } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) return; // mobile only
    const t = e.touches[0];
    swipeRef.current = { startY: t.clientY, startX: t.clientX, dy: 0, active: true };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s?.active) return;
    const t = e.touches[0];
    const dy = t.clientY - s.startY;
    const dx = Math.abs(t.clientX - s.startX);
    // Only track downward, mostly-vertical swipes
    if (dy > 0 && dy > dx) {
      s.dy = dy;
      setSwipeOffset(Math.min(dy, 400));
    }
  };
  const onTouchEnd = () => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (s && s.dy > 100) {
      onOpenChange(false);
    }
    setSwipeOffset(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
        style={{
          transform: swipeOffset
            ? `translate(-50%, calc(-50% + ${swipeOffset}px))`
            : undefined,
          transition: swipeOffset ? "none" : undefined,
          opacity: swipeOffset ? Math.max(0.4, 1 - swipeOffset / 400) : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mobile swipe handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-border/40">
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

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button
              variant="outline"
              onClick={copyAll}
              className="h-11 gap-2 border-[hsl(var(--primary))]/40 font-semibold"
            >
              <CopyCheck className="h-4 w-4" />
              Copy all
              <Badge value={counts.copy_all} label={ACTION_LABELS.copy_all} />
            </Button>
            <Button
              onClick={shareAll}
              className="h-11 gap-2 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 text-primary-foreground font-semibold shadow-lg"
            >
              <Share2 className="h-4 w-4" />
              Share all
              <Badge value={counts.share_all} label={ACTION_LABELS.share_all} />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Includes Card URL, QR image & referral link
          </p>
        </div>

        {/* Scrollable content for individual links */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Primary URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              Card URL
              <Badge value={cardUrlActions} label="Card URL shares" />
            </Label>
            <div className="flex gap-2">
              <Input value={primaryUrl} readOnly className="flex-1 font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copy(primaryUrl, "Card URL", "url_copy")}
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() =>
                  shareUrlAction(primaryUrl, title, "Check out my digital business card", "url_share")
                }
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Copied {counts.url_copy}× · Shared {counts.url_share}× on this device
            </p>
          </div>

          {altUrl && altUrl !== primaryUrl && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4" />
                Alternate URL
                <Badge value={counts.alt_copy + counts.alt_share} label="Alt URL shares" />
              </Label>
              <div className="flex gap-2">
                <Input value={altUrl} readOnly className="flex-1 font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(altUrl, "Alternate URL", "alt_copy")}
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() =>
                    shareUrlAction(altUrl, title, "Check out my digital business card", "alt_share")
                  }
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
                <Badge value={referralActions} label="Referral shares" />
              </Label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="flex-1 font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(referralLink, "Referral link", "referral_copy")}
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() =>
                    shareUrlAction(
                      referralLink,
                      "Join Card-Ex by Tagex.app",
                      "Sign up using my referral link to get started!",
                      "referral_share"
                    )
                  }
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Copied {counts.referral_copy}× · Shared {counts.referral_share}× on this device
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
