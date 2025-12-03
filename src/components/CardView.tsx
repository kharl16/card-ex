import RiderHeader from "@/components/RiderHeader";
import ProductRingCarousel from "@/components/ProductRingCarousel";
import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Download,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { CardTheme, getActiveTheme } from "@/lib/theme";

type CardData = Tables<"cards">;

export interface SocialLink {
  id: string;
  kind: string;
  label: string;
  value: string;
  icon: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  description?: string | null;
  sort_order?: number | null;
}

export interface AdditionalContact {
  id: string;
  kind: "email" | "phone" | "url" | "custom";
  label: string;
  value: string;
  contactType: "work" | "home" | "mobile" | "office" | "other";
}

interface CardViewProps {
  card: CardData;
  socialLinks: SocialLink[];
  productImages: ProductImage[];
  additionalContacts?: AdditionalContact[];
  isInteractive?: boolean;
  showQRCode?: boolean;
  showVCardButtons?: boolean;
}

// Helper to get live composed name
function getLiveNameFromCard(card: CardData): string {
  const parts: string[] = [];
  if (card.prefix?.trim()) parts.push(card.prefix.trim());
  if (card.first_name?.trim()) parts.push(card.first_name.trim());
  if (card.middle_name?.trim()) parts.push(card.middle_name.trim());
  if (card.last_name?.trim()) parts.push(card.last_name.trim());
  if (card.suffix?.trim()) parts.push(card.suffix.trim());
  return parts.join(" ") || card.full_name || "Unnamed";
}

const getSocialIcon = (kind: string) => {
  switch (kind) {
    case "facebook":
      return <Facebook className="h-5 w-5" />;
    case "linkedin":
      return <Linkedin className="h-5 w-5" />;
    case "instagram":
      return <Instagram className="h-5 w-5" />;
    case "youtube":
      return <Youtube className="h-5 w-5" />;
    case "x":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "telegram":
      return <MessageCircle className="h-5 w-5" />;
    case "tiktok":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case "url":
    default:
      return <ExternalLink className="h-5 w-5" />;
  }
};

const getContactIcon = (kind: string) => {
  switch (kind) {
    case "email":
      return <Mail className="h-4 w-4" />;
    case "phone":
      return <Phone className="h-4 w-4" />;
    case "url":
      return <Globe className="h-4 w-4" />;
    case "custom":
      return <MapPin className="h-4 w-4" />;
    default:
      return null;
  }
};

export default function CardView({
  card,
  socialLinks,
  productImages,
  additionalContacts = [],
  isInteractive = true,
  showQRCode = true,
  showVCardButtons = true,
}: CardViewProps) {
  const rawTheme = card.theme as CardTheme | undefined;
  const theme = getActiveTheme(rawTheme);

  const primaryColor = theme?.primary || "#D4AF37";
  const buttonColor = theme?.buttonColor || primaryColor;
  const carouselEnabled = card.carousel_enabled !== false;
  const carouselSpeed = theme?.carouselSpeed || 4000;

  const liveName = getLiveNameFromCard(card);

  const handleSaveContact = async () => {
    if (!isInteractive) return;

    try {
      // Track vcard download event
      supabase.functions
        .invoke("track-card-event", {
          body: { card_id: card.id, kind: "vcard_download" },
        })
        .catch((err) => console.error("Failed to track vcard download:", err));

      // Generate vCard via edge function
      const { data, error } = await supabase.functions.invoke("generate-vcard", {
        body: { card_id: card.id },
      });

      if (error) throw error;

      // Download the vCard
      const blob = new Blob([data.vcard], { type: "text/vcard" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${liveName.replace(/\s+/g, "_")}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Contact saved!");
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    }
  };

  const handleContactClick = (type: string, value: string) => {
    if (!isInteractive) return;

    // Track CTA click
    supabase.functions
      .invoke("track-card-event", {
        body: { card_id: card.id, kind: "cta_click" },
      })
      .catch((err) => console.error("Failed to track CTA:", err));

    switch (type) {
      case "email":
        window.location.href = `mailto:${value}`;
        break;
      case "phone":
        window.location.href = `tel:${value}`;
        break;
      case "website":
      case "url":
        window.open(value.startsWith("http") ? value : `https://${value}`, "_blank");
        break;
      case "location":
      case "custom":
        window.open(`https://maps.google.com/?q=${encodeURIComponent(value)}`, "_blank");
        break;
    }
  };

  const handleSocialClick = (link: SocialLink) => {
    if (!isInteractive) return;

    // Track CTA click
    supabase.functions
      .invoke("track-card-event", {
        body: { card_id: card.id, kind: "cta_click" },
      })
      .catch((err) => console.error("Failed to track CTA:", err));

    const url = link.value.startsWith("http") ? link.value : `https://${link.value}`;
    window.open(url, "_blank");
  };

  // Map product images to carousel format
  const carouselImages = productImages.map((img) => ({
    id: img.id,
    url: img.image_url,
    alt: img.alt_text || undefined,
  }));

  return (
    <div className="space-y-6 rounded-xl bg-card p-4 sm:p-6 shadow-lg">
      {/* Header with cover, avatar, logo */}
      <RiderHeader
        coverUrl={card.cover_url}
        avatarUrl={card.avatar_url}
        companyLogoUrl={card.logo_url}
        name={liveName}
        title={card.title || undefined}
        primaryColor={primaryColor}
        avatarDisplayMode={theme?.avatarDisplayMode || "contain"}
        logoDisplayMode={theme?.logoDisplayMode || "contain"}
      />

      {/* Bio */}
      {card.bio && (
        <p className="text-sm text-muted-foreground leading-relaxed px-2">{card.bio}</p>
      )}

      {/* Company */}
      {card.company && (
        <p className="text-sm font-medium text-foreground/80 px-2">{card.company}</p>
      )}

      {/* Primary Contact Actions */}
      <div className="grid grid-cols-2 gap-2 px-2">
        {card.email && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 group transition-all duration-300 hover:scale-[1.02]"
            onClick={() => handleContactClick("email", card.email!)}
            style={{ animationDelay: "0.1s" }}
          >
            <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="truncate">Email</span>
          </Button>
        )}
        {card.phone && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 group transition-all duration-300 hover:scale-[1.02]"
            onClick={() => handleContactClick("phone", card.phone!)}
            style={{ animationDelay: "0.2s" }}
          >
            <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="truncate">Call</span>
          </Button>
        )}
        {card.website && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 group transition-all duration-300 hover:scale-[1.02]"
            onClick={() => handleContactClick("website", card.website!)}
            style={{ animationDelay: "0.3s" }}
          >
            <Globe className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="truncate">Website</span>
          </Button>
        )}
        {card.location && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 group transition-all duration-300 hover:scale-[1.02]"
            onClick={() => handleContactClick("location", card.location!)}
            style={{ animationDelay: "0.4s" }}
          >
            <MapPin className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="truncate">Location</span>
          </Button>
        )}
      </div>

      {/* Additional Contacts */}
      {additionalContacts.length > 0 && (
        <div className="space-y-2 px-2">
          <p className="text-xs font-medium text-muted-foreground">Additional Contacts</p>
          <div className="grid grid-cols-2 gap-2">
            {additionalContacts.map((contact) => (
              <Button
                key={contact.id}
                variant="outline"
                size="sm"
                className="gap-2 group transition-all duration-300 hover:scale-[1.02]"
                onClick={() => handleContactClick(contact.kind, contact.value)}
              >
                {getContactIcon(contact.kind)}
                <span className="truncate text-xs">{contact.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 px-2">
          {socialLinks.map((link, index) => (
            <button
              key={link.id}
              onClick={() => handleSocialClick(link)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110"
              style={{
                animationDelay: `${0.1 + index * 0.1}s`,
              }}
              title={link.label}
            >
              {getSocialIcon(link.kind)}
            </button>
          ))}
        </div>
      )}

      {/* Product Images Carousel */}
      {carouselEnabled && carouselImages.length > 0 && (
        <ProductRingCarousel images={carouselImages} autoPlayMs={carouselSpeed} />
      )}

      {/* Save Contact Button */}
      {showVCardButtons && (
        <div className="flex justify-center px-2">
          <Button
            onClick={handleSaveContact}
            className="w-full gap-2 text-white font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] animate-pulse"
            style={{
              backgroundColor: buttonColor,
              animationDuration: "2s",
            }}
          >
            <Download className="h-5 w-5" />
            Save Contact
          </Button>
        </div>
      )}

      {/* QR Code */}
      {showQRCode && (
        <div className="flex flex-col items-center gap-3 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">Scan to save contact</p>
          <QRCodeDisplay
            url={card.public_url || card.share_url || `https://card-ex.com/c/${card.slug}`}
            settings={theme?.qr}
            size={160}
            showDownload={isInteractive}
            downloadFileName={`${liveName.replace(/\s+/g, "_")}_qr`}
          />
        </div>
      )}
    </div>
  );
}
