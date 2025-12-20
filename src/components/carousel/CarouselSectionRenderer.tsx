import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CardExCarousel from "@/components/CardExCarousel";
import { cn } from "@/lib/utils";
import {
  type CarouselSection,
  type CarouselKey,
  type CTAContactMethod,
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
  contactInfo?: ContactInfo;
  isInteractive?: boolean;
  className?: string;
}

export default function CarouselSectionRenderer({
  carouselKey,
  section,
  contactInfo = {},
  isInteractive = true,
  className,
}: CarouselSectionRendererProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  // Don't render if no images or disabled
  if (!section.settings.enabled || section.images.length === 0) {
    return null;
  }

  const { cta, background, settings, images, title } = section;

  // Handle CTA actions
  const handleCTAClick = useCallback(() => {
    if (!isInteractive) return;

    switch (cta.action) {
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

  // Convert images to CardExCarousel format
  const carouselItems = images
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, settings.maxImages)
    .map((img, idx) => ({
      id: `${carouselKey}-${idx}`,
      url: img.url,
      alt: img.alt,
    }));

  // Background styles
  const backgroundStyle = getCarouselBackgroundCSS(background);
  const hasBackground = background.enabled && background.type !== "transparent";

  // CTA button classes
  const ctaClasses = getCTAButtonClasses(cta.style);
  const showCTA = cta.enabled && images.length > 0;

  // CTA variant mapping
  const buttonVariant = cta.style.variant === "solid" ? "default" : cta.style.variant;

  return (
    <section
      id={`carousel-${carouselKey}`}
      className={cn("relative w-full", className)}
    >
      {/* Header with title and optional CTA */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {showCTA && cta.placement === "header_right" && (
          <Button
            variant={buttonVariant}
            className={ctaClasses}
            onClick={handleCTAClick}
            style={{
              backgroundColor: cta.style.background,
              color: cta.style.text,
              borderColor: cta.style.border,
            }}
          >
            {cta.label}
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
        />

        {/* Overlay CTA */}
        {showCTA && cta.placement === "overlay_bottom" && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              variant={buttonVariant}
              className={cn(ctaClasses, "backdrop-blur-sm bg-opacity-90")}
              onClick={handleCTAClick}
              style={{
                backgroundColor: cta.style.background,
                color: cta.style.text,
                borderColor: cta.style.border,
              }}
            >
              {cta.label}
            </Button>
          </div>
        )}
      </div>

      {/* Below CTA */}
      {showCTA && cta.placement === "below" && (
        <div className="flex justify-center mt-4 px-4">
          <Button
            variant={buttonVariant}
            className={ctaClasses}
            onClick={handleCTAClick}
            style={{
              backgroundColor: cta.style.background,
              color: cta.style.text,
              borderColor: cta.style.border,
            }}
          >
            {cta.label}
          </Button>
        </div>
      )}

      {/* Modal dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cta.label}</DialogTitle>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none">
            {cta.modal_content}
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
