import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CardExCarousel from "@/components/CardExCarousel";
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
}

export default function CarouselSectionRenderer({
  carouselKey,
  section,
  images: imagesProp,
  contactInfo = {},
  isInteractive = true,
  className,
}: CarouselSectionRendererProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  // Safe access with defaults - handle missing/incomplete data gracefully
  // Use imagesProp if provided, otherwise fall back to section.images
  const images = imagesProp ?? section?.images ?? [];
  const settings = section?.settings ?? { enabled: true, autoPlayMs: 4000, direction: "ltr" as const, maxImages: 50, imageSize: "md" as const };
  const background = section?.background ?? { enabled: false, type: "transparent" as const };
  const cta = section?.cta ?? { enabled: false, label: "", action: "link" as const, placement: "below" as const, style: { variant: "solid" as const, shape: "pill" as const, size: "md" as const, width: "fit" as const } };
  const title = section?.title ?? carouselKey.charAt(0).toUpperCase() + carouselKey.slice(1);

  // Direction defaults by carousel key
  const defaultDirection = carouselKey === "packages" ? "ltr" : "rtl";
  const direction = settings.direction ?? defaultDirection;
  const imageSize = settings.imageSize ?? "md";

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

  // Background styles
  const backgroundStyle = getCarouselBackgroundCSS(background);
  const hasBackground = background?.enabled && background?.type !== "transparent";

  // CTA button classes - with safe defaults
  const ctaStyle = cta?.style ?? { variant: "solid" as const, shape: "pill" as const, size: "md" as const, width: "fit" as const };
  const ctaClasses = getCTAButtonClasses(ctaStyle);
  const showCTA = cta?.enabled && images.length > 0;

  // CTA variant mapping
  const buttonVariant = ctaStyle.variant === "solid" ? "default" : ctaStyle.variant;

  return (
    <section
      id={`carousel-${carouselKey}`}
      className={cn("relative w-full", className)}
    >
      {/* Header with title and optional CTA */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {showCTA && cta?.placement === "header_right" && (
          <Button
            variant={buttonVariant}
            className={ctaClasses}
            onClick={handleCTAClick}
            style={{
              backgroundColor: ctaStyle.background,
              color: ctaStyle.text,
              borderColor: ctaStyle.border,
            }}
          >
            {cta?.label || "Click"}
          </Button>
        )}
      </div>

      {/* Carousel container with background */}
      <div
        className={cn(
          "relative w-full py-4",
          hasBackground && "rounded-xl"
        )}
        style={backgroundStyle}
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
        />

        {/* Overlay CTA */}
        {showCTA && cta?.placement === "overlay_bottom" && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              variant={buttonVariant}
              className={cn(ctaClasses, "backdrop-blur-sm bg-opacity-90")}
              onClick={handleCTAClick}
              style={{
                backgroundColor: ctaStyle.background,
                color: ctaStyle.text,
                borderColor: ctaStyle.border,
              }}
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
            style={{
              backgroundColor: ctaStyle.background,
              color: ctaStyle.text,
              borderColor: ctaStyle.border,
            }}
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
