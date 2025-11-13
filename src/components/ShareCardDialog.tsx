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
import { Switch } from "@/components/ui/switch";
import { Copy, Download, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface ShareCardDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareLink {
  id: string;
  code: string;
  is_active: boolean;
  label: string | null;
  created_at: string;
}

export default function ShareCardDialog({ cardId, open, onOpenChange }: ShareCardDialogProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadShareLink();
    }
  }, [open, cardId]);

  useEffect(() => {
    if (shareLink && shareLink.is_active) {
      generateQR();
    }
  }, [shareLink]);

  const loadShareLink = async () => {
    const { data, error } = await supabase
      .from("share_links")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setShareLink(data);
      setLabel(data.label || "");
    }
  };

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const createShareLink = async () => {
    setLoading(true);
    const code = generateShareCode();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("share_links")
      .insert({
        card_id: cardId,
        code,
        label: label || null,
        created_by: user?.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create share link");
    } else {
      setShareLink(data);
      toast.success("Share link created!");
    }
    setLoading(false);
  };

  const regenerateLink = async () => {
    if (!shareLink) return;
    
    setLoading(true);
    // Disable old link
    await supabase
      .from("share_links")
      .update({ is_active: false })
      .eq("id", shareLink.id);

    // Create new link
    await createShareLink();
    setLoading(false);
  };

  const toggleActive = async () => {
    if (!shareLink) return;

    const { error } = await supabase
      .from("share_links")
      .update({ is_active: !shareLink.is_active })
      .eq("id", shareLink.id);

    if (error) {
      toast.error("Failed to update share link");
    } else {
      setShareLink({ ...shareLink, is_active: !shareLink.is_active });
      toast.success(shareLink.is_active ? "Link disabled" : "Link enabled");
    }
  };

  const updateLabel = async () => {
    if (!shareLink) return;

    const { error } = await supabase
      .from("share_links")
      .update({ label })
      .eq("id", shareLink.id);

    if (error) {
      toast.error("Failed to update label");
    } else {
      toast.success("Label updated");
    }
  };

  const copyToClipboard = () => {
    if (!shareLink) return;
    const url = `${window.location.origin}/s/${shareLink.code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const generateQR = async () => {
    if (!shareLink) return;
    const url = `${window.location.origin}/s/${shareLink.code}`;
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
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `card-share-qr-${shareLink?.code}.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  const shareUrl = shareLink ? `${window.location.origin}/s/${shareLink.code}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card
          </DialogTitle>
          <DialogDescription>
            Generate a unique shareable link with QR code for tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareLink ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  placeholder="e.g., Facebook Ads, QR Poster"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <Button onClick={createShareLink} disabled={loading} className="w-full">
                Create Share Link
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-url">Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label-edit">Label</Label>
                <div className="flex gap-2">
                  <Input
                    id="label-edit"
                    placeholder="e.g., Facebook Ads"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <Button variant="outline" onClick={updateLabel}>
                    Update
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {shareLink.is_active ? "Link is active" : "Link is disabled"}
                  </p>
                </div>
                <Switch
                  checked={shareLink.is_active}
                  onCheckedChange={toggleActive}
                />
              </div>

              {qrDataUrl && shareLink.is_active && (
                <div className="space-y-2">
                  <Label>QR Code</Label>
                  <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
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

              <Button
                variant="outline"
                onClick={regenerateLink}
                disabled={loading}
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Generate New Link
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Created {new Date(shareLink.created_at).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
