import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import type { QRDisplaySettings } from "@/components/qr/QRCodeDisplay";

interface ShareCardDialogProps {
  cardId: string;
  allCardIds?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CardData {
  id: string;
  slug: string;
  full_name: string;
  share_url: string;
  public_url: string;
  custom_slug: string | null;
  theme?: {
    qr?: QRDisplaySettings;
  } | null;
}

export default function ShareCardDialog({ cardId, allCardIds, open, onOpenChange }: ShareCardDialogProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);

  const idsToLoad = allCardIds && allCardIds.length > 0 ? allCardIds : [cardId];

  useEffect(() => {
    if (open) {
      loadCards();
    }
  }, [open, cardId, allCardIds]);

  const loadCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("id, slug, full_name, share_url, public_url, custom_slug, theme")
      .in("id", idsToLoad);

    if (error) {
      toast.error("Failed to load card");
    } else {
      setCards((data as CardData[]) || []);
    }
    setLoading(false);
  };

  const handleCopy = (url: string, label?: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`✅ Link copied: ${label || url}`);
  };

  const renderCardSection = (card: CardData, showLabel: boolean) => {
    const shareUrl = card.public_url || card.share_url;
    const customUrl = card.custom_slug ? `https://tagex.app/${card.custom_slug}` : null;
    const hideShareUrl = customUrl && shareUrl === customUrl;
    return (
      <div key={card.id} className="space-y-3">
        {showLabel && (
          <p className="text-sm font-semibold text-foreground">{card.full_name || "Untitled Card"}</p>
        )}
        {!hideShareUrl && (
          <div className="space-y-2">
            <Label>Share URL</Label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1 font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => handleCopy(shareUrl)} title="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {card.public_url?.includes('/c/') ? 'Permanent shareable link' : 'Branded short URL'}
            </p>
          </div>
        )}

        {card.custom_slug && (
          <div className="space-y-2">
            <Label>Custom URL</Label>
            <div className="flex gap-2">
              <Input
                value={`https://tagex.app/${card.custom_slug}`}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(`https://tagex.app/${card.custom_slug}`, `tagex.app/${card.custom_slug}`)}
                title="Copy custom link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--primary))]">✓ Your personalized branded URL</p>
          </div>
        )}
      </div>
    );
  };

  const showLabels = cards.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card{cards.length > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Share your digital business card{cards.length > 1 ? "s" : ""} with unique URLs and QR codes.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : cards.length > 0 ? (
          <div className="space-y-5">
            {cards.map((card) => (
              <div key={card.id} className={showLabels ? "rounded-lg border border-border/40 p-3 space-y-3" : "space-y-4"}>
                {renderCardSection(card, showLabels)}
                <div className="space-y-2">
                  <Label>QR Code</Label>
                  <div className="flex flex-col items-center gap-2 rounded-lg border p-4 bg-card">
                    <QRCodeDisplay
                      url={card.public_url || card.share_url || ""}
                      settings={card.theme?.qr}
                      size={192}
                      showDownload={true}
                      downloadFileName={`card-ex-${card.full_name?.replace(/\s+/g, "-") || card.slug}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load card
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}