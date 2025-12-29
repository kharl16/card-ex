import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Download,
  MessageCircle,
  Facebook,
  Send,
  Mail,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadAllAsZip, downloadSingleImage } from "@/lib/share";
import { getPublicCardUrl } from "@/lib/cardUrl";
import { Helmet } from "react-helmet";
import type { CarouselKey } from "@/lib/carouselTypes";

const CAROUSEL_LABELS: Record<CarouselKey, string> = {
  products: "Products",
  packages: "Packages", 
  testimonies: "Testimonies",
};

// Social share URL generators
function getMessengerShareUrl(url: string): string {
  return `https://www.facebook.com/dialog/share?display=popup&href=${encodeURIComponent(url)}`;
}

function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function getWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
}

function getTelegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function getXShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function getViberShareUrl(text: string, url: string): string {
  return `viber://forward?text=${encodeURIComponent(text + " " + url)}`;
}

function getEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function CarouselSharePage() {
  const { slug, carouselKind } = useParams<{ slug: string; carouselKind: string }>();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<"all" | "card" | number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const kind = (carouselKind || "products") as CarouselKey;
  const publicCardUrl = slug ? getPublicCardUrl(slug) : "";
  const sharePageUrl = `${publicCardUrl}/share/${kind}`;

  useEffect(() => {
    async function loadCard() {
      if (!slug) return;
      
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!error && data) {
        setCard(data);
      }
      setLoading(false);
    }

    loadCard();
  }, [slug]);

  // Get images based on carousel kind
  const getImages = (): string[] => {
    if (!card) return [];
    
    switch (kind) {
      case "products":
        return Array.isArray(card.product_images) ? card.product_images : [];
      case "packages":
        return Array.isArray(card.package_images) ? card.package_images : [];
      case "testimonies":
        return Array.isArray(card.testimony_images) ? card.testimony_images : [];
      default:
        return [];
    }
  };

  const images = getImages();
  const title = card?.full_name ? `${CAROUSEL_LABELS[kind]} by ${card.full_name}` : CAROUSEL_LABELS[kind];
  const shareText = `Check out these ${CAROUSEL_LABELS[kind].toLowerCase()}!`;

  const handleCopyLink = async (link: string, key: "all" | "card" | number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(key);
      toast({ title: "Copied!", description: "Link copied to clipboard" });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    setDownloadingAll(true);
    try {
      await downloadAllAsZip({ imageUrls: images, carouselKind: kind });
      toast({ title: "Download started", description: "Your ZIP file is downloading" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      await downloadSingleImage(url, `${kind}-image-${index + 1}`);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const openShareUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const socialButtons = [
    {
      name: "Messenger",
      icon: MessageCircle,
      color: "bg-gradient-to-r from-[#00C6FF] to-[#0078FF]",
      onClick: () => openShareUrl(getMessengerShareUrl(sharePageUrl)),
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-[#1877F2]",
      onClick: () => openShareUrl(getFacebookShareUrl(sharePageUrl)),
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-[#25D366]",
      onClick: () => openShareUrl(getWhatsAppShareUrl(shareText, sharePageUrl)),
    },
    {
      name: "Telegram",
      icon: Send,
      color: "bg-[#26A5E4]",
      onClick: () => openShareUrl(getTelegramShareUrl(shareText, sharePageUrl)),
    },
    {
      name: "X",
      icon: ExternalLink,
      color: "bg-black",
      onClick: () => openShareUrl(getXShareUrl(shareText, sharePageUrl)),
    },
    {
      name: "Viber",
      icon: MessageCircle,
      color: "bg-[#7360F2]",
      onClick: () => openShareUrl(getViberShareUrl(shareText, sharePageUrl)),
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-[#EA4335]",
      onClick: () => {
        const body = `${shareText}\n\n${sharePageUrl}`;
        window.location.href = getEmailShareUrl(title, body);
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!card || images.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">No images found</p>
        <Link to={publicCardUrl}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Card
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={shareText} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={shareText} />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta property="og:url" content={sharePageUrl} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to={publicCardUrl}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">{CAROUSEL_LABELS[kind]}</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloadingAll}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingAll ? "..." : "All"}
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Social Share Buttons */}
          <section className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Share via</h2>
            <div className="flex flex-wrap gap-2">
              {socialButtons.map((btn) => (
                <button
                  key={btn.name}
                  onClick={btn.onClick}
                  className={`${btn.color} flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity`}
                >
                  <btn.icon className="h-4 w-4 text-white" />
                  <span className="text-sm text-white font-medium">{btn.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Copy Links */}
          <section className="mb-8 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(sharePageUrl, "all")}
            >
              {copiedLink === "all" ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy page link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(publicCardUrl, "card")}
            >
              {copiedLink === "card" ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy card link
            </Button>
          </section>

          {/* Image Grid */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              {images.length} {images.length === 1 ? "Image" : "Images"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((url, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={url}
                    alt={`${kind} ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(url, index)}
                    >
                      {copiedLink === index ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleDownloadSingle(url, index)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
