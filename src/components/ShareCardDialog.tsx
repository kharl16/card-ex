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
import { Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface ShareCardDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CardData {
  slug: string;
  share_url: string;
  public_url: string;
}

export default function ShareCardDialog({ cardId, open, onOpenChange }: ShareCardDialogProps) {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadCard();
    }
  }, [open, cardId]);

  useEffect(() => {
    if (card?.public_url || card?.share_url) {
      generateQR();
    }
  }, [card]);

  const loadCard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("slug, share_url, public_url")
      .eq("id", cardId)
      .single();

    if (error) {
      toast.error("Failed to load card");
    } else {
      setCard(data);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    const url = card?.public_url || card?.share_url;
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success(`✅ Share link copied: ${url}`);
  };

  const generateQR = async () => {
    const url = card?.public_url || card?.share_url;
    if (!url) return;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  };

  const downloadQR = async () => {
    if (!qrDataUrl || !card) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `card-ex-${card.slug}.png`;
    link.click();
    toast.success("QR code downloaded!");
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
                This is your permanent shareable link
              </p>
            </div>

            {qrDataUrl && (
              <div className="space-y-2">
                <Label>QR Code</Label>
                <div className="flex flex-col items-center gap-2 rounded-lg border p-4 bg-card">
                  <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
                  <Button
                    variant="outline"
                    onClick={downloadQR}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            )}
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
