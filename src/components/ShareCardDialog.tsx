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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CardData {
  slug: string;
  full_name: string;
  share_url: string;
  public_url: string;
  theme?: {
    qr?: QRDisplaySettings;
  } | null;
}

export default function ShareCardDialog({ cardId, open, onOpenChange }: ShareCardDialogProps) {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCard();
    }
  }, [open, cardId]);

  const loadCard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("slug, full_name, share_url, public_url, theme")
      .eq("id", cardId)
      .single();

    if (error) {
      toast.error("Failed to load card");
    } else {
      setCard(data as CardData);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    const url = card?.public_url || card?.share_url;
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success(`✅ Share link copied: ${url}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card
          </DialogTitle>
          <DialogDescription>
            Share your digital business card with a unique URL and QR code.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : card ? (
          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-url">Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={card.public_url || card.share_url}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.public_url?.includes('/c/') 
                    ? 'This is your permanent shareable link' 
                    : 'This is your branded short URL'}
                </p>
              </div>

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
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load card
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
