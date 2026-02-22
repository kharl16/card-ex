import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CardExCarousel from "@/components/CardExCarousel";
import CarouselShareHeader from "@/components/carousel/CarouselShareHeader";
import { cn } from "@/lib/utils";
import {
  type CarouselSection,
  type CarouselKey,
  type CTAContactMethod,
  type CarouselImage,
  getCarouselBackgroundCSS,
  getCTAButtonClasses,
} from "@/lib/carouselTypes";
import { toast } from "sonner";
import type { CarouselKind } from "@/lib/share";

interface ContactInfo {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface CarouselSectionRendererProps {
  carouselKey: CarouselKey;
  section: CarouselSection;
  /** Images array - now passed directly from the card's image columns */
  images?: CarouselImage[];
  contactInfo?: ContactInfo;
  isInteractive?: boolean;
  className?: string;
  /** Enable share buttons */
  shareEnabled?: boolean;
  /** URL for sharing */
  shareUrl?: string;
  /** Card slug for share page navigation */
  cardSlug?: string;
}

export default function CarouselSectionRenderer({
  carouselKey,
  section,
  images: imagesProp,
  contactInfo = {},
  isInteractive = true,
  className,
  shareEnabled = true,
  shareUrl,
  cardSlug,
}: CarouselSectionRendererProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  // Safe access with defaults - handle missing/incomplete data gracefully
  // Use imagesProp if provided, otherwise fall back to section.images
  const images = imagesProp ?? section?.images ?? [];
  const settings = section?.settings ?? { enabled: true, autoPlayMs: 4000, direction: "ltr" as const, maxImages: 50, imageSize: "md" as const, imageGap: 12 };
  const background = section?.background ?? { enabled: false, type: "transparent" as const };
  const cta = section?.cta ?? { enabled: false, label: "", action: "link" as const, placement: "below" as const, style: { variant: "solid" as const, shape: "pill" as const, size: "md" as const, width: "fit" as const } };
  const title = section?.title ?? carouselKey.charAt(0).toUpperCase() + carouselKey.slice(1);

  // Direction defaults by carousel key
  const defaultDirection = carouselKey === "packages" ? "ltr" : "rtl";
  const direction = settings.direction ?? defaultDirection;
  const imageSize = settings.imageSize ?? "md";
  const imageGap = settings.imageGap ?? 12;

  // Check if should render
  const isEnabled = settings.enabled !== false;
  const shouldRender = isEnabled && images.length > 0;

  // Handle CTA actions - must be defined before any early return
  const handleCTAClick = useCallback(() => {
    if (!isInteractive) return;

    switch (cta?.action) {
      case "link":
        if (cta.href) {
          window.open(cta.href, cta.target || "_blank");
        } else {
          toast.error("Link URL not configured");
        }
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
        if (cta.modal_content) {
          setModalOpen(true);
        } else {
          toast.error("Modal content not configured");
        }
        break;
    }
  }, [cta, contactInfo, isInteractive]);

  // Don't render if no images or explicitly disabled - AFTER all hooks
  if (!shouldRender) {
    return null;
  }

  // Convert images to CardExCarousel format
  const carouselItems = images
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, settings.maxImages ?? 50)
    .map((img, idx) => ({
      id: `${carouselKey}-${idx}`,
      url: img.url,
      alt: img.alt,
    }));

  // Background styles - generate CSS including padding and border
  const backgroundStyle = getCarouselBackgroundCSS(background);
  const hasBackground = background?.enabled && background?.type !== "transparent";
  const hasAnyBackgroundStyling = background?.enabled || (background?.innerPadding && background.innerPadding > 0) || (background?.borderWidth && background.borderWidth > 0);

  // CTA button classes - with safe defaults
  const ctaStyle = cta?.style ?? { variant: "solid" as const, shape: "pill" as const, size: "md" as const, width: "fit" as const };
  const ctaClasses = getCTAButtonClasses(ctaStyle);
  const showCTA = cta?.enabled && images.length > 0;

  // CTA variant mapping
  const buttonVariant = ctaStyle.variant === "solid" ? "default" : ctaStyle.variant;

  // Build inline style object only with defined values - prevents undefined from overriding CSS
  const ctaInlineStyle: React.CSSProperties = {};
  if (ctaStyle.background) ctaInlineStyle.backgroundColor = ctaStyle.background;
  if (ctaStyle.text) ctaInlineStyle.color = ctaStyle.text;
  if (ctaStyle.border) ctaInlineStyle.borderColor = ctaStyle.border;

  const withAlpha = (color: string, alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha));
    const pct = Math.round(a * 100);

    // #rgb, #rrggbb, #rrggbbaa
    if (color.startsWith("#")) {
      const hex = color.replace("#", "").trim();
      const norm =
        hex.length === 3
          ? hex
              .split("")
              .map((c) => c + c)
              .join("")
          : hex.length === 6 || hex.length === 8
            ? hex.slice(0, 6)
            : null;

      if (norm) {
        const r = parseInt(norm.slice(0, 2), 16);
        const g = parseInt(norm.slice(2, 4), 16);
        const b = parseInt(norm.slice(4, 6), 16);
        return `rgb(${r} ${g} ${b} / ${pct}%)`;
      }
    }

    // hsl(...) can accept alpha as a slash value
    if (color.startsWith("hsl(") && color.endsWith(")")) {
      const inner = color.slice(4, -1).trim();
      if (!inner.includes("/")) {
        return `hsl(${inner} / ${pct}%)`;
      }
    }

    // Fallback for other valid CSS colors (var(), named colors, etc.)
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  };

  // Glow effect (use inline box-shadow so it works even with custom Tailwind shadow tokens)
  if (ctaStyle.glow) {
    const intensity = ctaStyle.glowIntensity ?? 25;
    const glowMode = ctaStyle.glowColorMode ?? "primary";
    
    // Determine glow color based on mode
    let glowColor: string;
    switch (glowMode) {
      case "background":
        glowColor = ctaStyle.background ?? "hsl(var(--primary))";
        break;
      case "custom":
        glowColor = ctaStyle.glowCustomColor ?? "hsl(var(--primary))";
        break;
      case "primary":
      default:
        glowColor = "hsl(var(--primary))";
        break;
    }

    const glowAlpha = Math.max(0.08, Math.min(0.7, (intensity / 100) * 0.6));
    const rimAlpha = Math.max(0.06, Math.min(0.35, (intensity / 100) * 0.25));

    ctaInlineStyle.boxShadow = [
      `0 14px 28px -12px ${withAlpha(glowColor, glowAlpha)}`,
      `0 0 0 1px ${withAlpha(glowColor, rimAlpha)}`,
    ].join(", ");
  }

  // Map carouselKey to CarouselKind for share component
  const carouselKindMap: Record<CarouselKey, CarouselKind> = {
    products: "products",
    packages: "packages",
    testimonies: "testimonies",
    videos: "videos",
  };
  const carouselKind = carouselKindMap[carouselKey];
  const imageUrls = carouselItems.map((item) => item.url);

  return (
    <section
      id={`carousel-${carouselKey}`}
      className={cn("relative w-full py-2", className)}
    >
      {/* Header with title, share buttons, and optional CTA */}
      <div className="flex flex-col gap-1 px-4 mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
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
        {/* Share buttons row - aligned below title */}
        {shareEnabled && imageUrls.length > 0 && (
          <CarouselShareHeader
            carouselKind={carouselKind}
            imageUrls={imageUrls}
            shareEnabled={shareEnabled}
            shareAllEnabled={true}
            shareUrl={shareUrl}
            cardSlug={cardSlug}
            title={title}
            className="justify-start -ml-1"
          />
        )}
      </div>

      {/* Carousel container with background */}
      <div className="relative w-full">
        <div
          className={cn(
            "relative w-full py-3 rounded-xl overflow-hidden",
            hasBackground && "shadow-inner"
          )}
          style={hasAnyBackgroundStyling ? backgroundStyle : undefined}
        >
          <CardExCarousel
            items={carouselItems}
            mode="roulette"
            autoPlayMs={settings.autoPlayMs}
            showLightbox={true}
            depth="medium"
            spotlightEnabled={true}
            direction={direction}
            imageSize={imageSize}
            imageGap={imageGap}
            shareUrl={shareUrl}
          />
        </div>

        {/* Overlay CTA (outside overflow-hidden so glow isn't clipped) */}
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

      {/* Below CTA */}
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

      {/* Modal dialog */}
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

// Handle contact action
function handleContactAction(
  method: CTAContactMethod | undefined,
  contactInfo: ContactInfo
) {
  const { phone, email } = contactInfo;

  switch (method) {
    case "messenger":
      // Messenger link would need Facebook page ID
      window.open("https://m.me/", "_blank");
      break;

    case "whatsapp":
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        window.open(`https://wa.me/${cleanPhone}`, "_blank");
      } else {
        toast.error("Phone number not configured");
      }
      break;

    case "viber":
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        window.open(`viber://chat?number=${cleanPhone}`, "_blank");
      } else {
        toast.error("Phone number not configured");
      }
      break;

    case "sms":
      if (phone) {
        window.open(`sms:${phone}`, "_self");
      } else {
        toast.error("Phone number not configured");
      }
      break;

    case "email":
      if (email) {
        window.open(`mailto:${email}`, "_self");
      } else {
        toast.error("Email not configured");
      }
      break;

    case "phone":
      if (phone) {
        window.open(`tel:${phone}`, "_self");
      } else {
        toast.error("Phone number not configured");
      }
      break;

    default:
      toast.error("Contact method not configured");
  }
}
