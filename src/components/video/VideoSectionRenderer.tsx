import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VideoCarousel from "@/components/video/VideoCarousel";
import { cn } from "@/lib/utils";
import {
  type CarouselSection,
  type CTAContactMethod,
  getCarouselBackgroundCSS,
  getCTAButtonClasses,
} from "@/lib/carouselTypes";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { getShareUrl, type VideoItem } from "@/lib/videoUtils";

interface ContactInfo {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface VideoSectionRendererProps {
  section: CarouselSection;
  videos: VideoItem[];
  contactInfo?: ContactInfo;
  isInteractive?: boolean;
  className?: string;
  shareUrl?: string;
}

export default function VideoSectionRenderer({
  section,
  videos,
  contactInfo = {},
  isInteractive = true,
  className,
  shareUrl,
}: VideoSectionRendererProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  const settings = section?.settings ?? { enabled: true, autoPlayMs: 0, direction: "ltr" as const, maxImages: 25, imageSize: "md" as const, imageGap: 12 };
  const background = section?.background ?? { enabled: false, type: "transparent" as const };
  const cta = section?.cta ?? { enabled: false, label: "", action: "link" as const, placement: "below" as const, style: { variant: "solid" as const, shape: "pill" as const, size: "md" as const, width: "fit" as const } };
  const title = section?.title ?? "Videos";

  const imageSize = settings.imageSize ?? "md";
  const imageGap = settings.imageGap ?? 12;

  const isEnabled = settings.enabled !== false;
  const shouldRender = isEnabled && videos.length > 0;

  const handleCTAClick = useCallback(() => {
    if (!isInteractive) return;
    switch (cta?.action) {
      case "link":
        if (cta.href) window.open(cta.href, cta.target || "_blank");
        else toast.error("Link URL not configured");
        break;
      case "scroll":
        if (cta.scroll_target) {
          const targetMap: Record<string, string> = {
            top: "body",
            contact: "#contact-section",
            carousel_products: "#carousel-products",
            carousel_packages: "#carousel-packages",
            carousel_testimonies: "#carousel-testimonies",
          };
          const target = document.querySelector(targetMap[cta.scroll_target] || "body");
          target?.scrollIntoView({ behavior: "smooth" });
        }
        break;
      case "contact":
        handleContactAction(cta.contact_method, contactInfo);
        break;
      case "modal":
        if (cta.modal_content) setModalOpen(true);
        else toast.error("Modal content not configured");
        break;
    }
  }, [cta, contactInfo, isInteractive]);

  if (!shouldRender) return null;

  const displayVideos = videos
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, settings.maxImages ?? 25);

  const backgroundStyle = getCarouselBackgroundCSS(background);
  const hasBackground = background?.enabled && background?.type !== "transparent";
  const hasAnyBackgroundStyling = background?.enabled || (background?.innerPadding && background.innerPadding > 0) || (background?.borderWidth && background.borderWidth > 0);

  const ctaStyle = cta?.style ?? { variant: "solid" as const, shape: "pill" as const, size: "md" as const, width: "fit" as const };
  const ctaClasses = getCTAButtonClasses(ctaStyle);
  const showCTA = cta?.enabled && videos.length > 0;
  const buttonVariant = ctaStyle.variant === "solid" ? "default" : ctaStyle.variant;

  const ctaInlineStyle: React.CSSProperties = {};
  if (ctaStyle.background) ctaInlineStyle.backgroundColor = ctaStyle.background;
  if (ctaStyle.text) ctaInlineStyle.color = ctaStyle.text;
  if (ctaStyle.border) ctaInlineStyle.borderColor = ctaStyle.border;

  const handleShareAll = async () => {
    const links = displayVideos.map((v) => getShareUrl(v.url));
    const text = `🎬 ${title}\n${links.join("\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Links copied to clipboard!");
    }
  };

  return (
    <section
      id="carousel-videos"
      className={cn("relative w-full py-2", className)}
    >
      <div className="flex flex-col gap-1 px-4 mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={handleShareAll}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share All
            </Button>
            {showCTA && cta?.placement === "header_right" && (
              <Button
                variant={buttonVariant}
                className={ctaClasses}
                onClick={handleCTAClick}
                style={Object.keys(ctaInlineStyle).length > 0 ? ctaInlineStyle : undefined}
              >
                {cta?.label || "Click"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="relative w-full">
        <div
          className={cn(
            "relative w-full py-3 rounded-xl overflow-hidden",
            hasBackground && "shadow-inner"
          )}
          style={hasAnyBackgroundStyling ? backgroundStyle : undefined}
        >
          <VideoCarousel
            videos={displayVideos}
            imageSize={imageSize}
            imageGap={imageGap}
            direction={settings.direction}
            shareUrl={shareUrl}
          />
        </div>

        {showCTA && cta?.placement === "overlay_bottom" && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              variant={buttonVariant}
              className={cn(ctaClasses, "backdrop-blur-sm bg-opacity-90")}
              onClick={handleCTAClick}
              style={Object.keys(ctaInlineStyle).length > 0 ? ctaInlineStyle : undefined}
            >
              {cta?.label || "Click"}
            </Button>
          </div>
        )}
      </div>

      {showCTA && cta?.placement === "below" && (
        <div className="flex justify-center mt-4 px-4">
          <Button
            variant={buttonVariant}
            className={ctaClasses}
            onClick={handleCTAClick}
            style={Object.keys(ctaInlineStyle).length > 0 ? ctaInlineStyle : undefined}
          >
            {cta?.label || "Click"}
          </Button>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cta?.label || "Details"}</DialogTitle>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none">
            {cta?.modal_content}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function handleContactAction(method: CTAContactMethod | undefined, contactInfo: ContactInfo) {
  const { phone, email } = contactInfo;
  switch (method) {
    case "whatsapp":
      if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, "")}`, "_blank");
      else toast.error("Phone number not configured");
      break;
    case "email":
      if (email) window.open(`mailto:${email}`, "_self");
      else toast.error("Email not configured");
      break;
    case "phone":
      if (phone) window.open(`tel:${phone}`, "_self");
      else toast.error("Phone number not configured");
      break;
    case "messenger":
      window.open("https://m.me/", "_blank");
      break;
    case "viber":
      if (phone) window.open(`viber://chat?number=${phone.replace(/\D/g, "")}`, "_blank");
      else toast.error("Phone number not configured");
      break;
    case "sms":
      if (phone) window.open(`sms:${phone}`, "_self");
      else toast.error("Phone number not configured");
      break;
    default:
      toast.error("Contact method not configured");
  }
}
