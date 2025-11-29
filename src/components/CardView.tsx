import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Download,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  Github,
  MessageCircle,
  Music,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProductRingCarousel from "@/components/ProductRingCarousel";
import { getGradientCSS, getPatternCSS, getPatternSize } from "@/components/ThemeCustomizer";
import { getActiveTheme } from "@/lib/theme";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type CardData = Tables<"cards">;

// Build live name from individual fields so it updates in real-time
const getLiveNameFromCard = (card: CardData | null): string => {
  if (!card) return "";

  const prefix = card.prefix?.trim();
  const first = card.first_name?.trim();
  const middle = card.middle_name?.trim();
  const last = card.last_name?.trim();
  const suffix = card.suffix?.trim();

  const mainParts = [prefix, first, middle, last].filter((part) => part && part.length > 0) as string[];

  let name = mainParts.join(" ");

  if (suffix) {
    name = `${name}, ${suffix}`;
  }

  return name || "Enter your name above";
};

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

interface CardViewProps {
  card: CardData;
  socialLinks: SocialLink[];
  productImages: ProductImage[];
  /** If true, renders interactive elements (links, download buttons). False for preview. */
  isInteractive?: boolean;
  /** If true, shows the QR code section */
  showQRCode?: boolean;
  /** If true, shows the vCard download buttons */
  showVCardButtons?: boolean;
}

const iconMap: Record<string, any> = {
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  Github,
  MessageCircle,
  Music,
  Globe,
};

const socialBrandColors: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  linkedin: "bg-[#0A66C2]",
  instagram: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FD1D1D]",
  x: "bg-black",
  youtube: "bg-[#FF0000]",
  telegram: "bg-[#26A5E4]",
  tiktok: "bg-black",
  url: "bg-[#4285F4]",
};

const contactBrandColors: Record<string, string> = {
  email: "bg-[#EA4335]",
  phone: "bg-[#34A853]",
  website: "bg-[#4285F4]",
  location: "bg-[#FBBC04]",
};

// Helper: adjust a hex color lighter/darker
function adjustHexColor(hex: string, amount: number): string {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }

  // Normalize #RGB to #RRGGBB
  let normalized = hex;
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    normalized = `#${r}${r}${g}${g}${b}${b}`;
  }

  const r = Math.min(255, Math.max(0, parseInt(normalized.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(normalized.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(normalized.slice(5, 7), 16) + amount));

  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function CardView({
  card,
  socialLinks,
  productImages,
  isInteractive = false,
  showQRCode = false,
  showVCardButtons = false,
}: CardViewProps) {
  // Use getActiveTheme for A/B variant support
  const theme = getActiveTheme(card.theme) || {
    primary: "#D4AF37",
    background: "#0B0B0C",
    text: "#F8F8F8",
  };

  const getBackgroundStyle = () => {
    if (!theme) return {};
    if (theme.backgroundType === "gradient") {
      return { background: getGradientCSS(theme) };
    }
    if (theme.backgroundType === "pattern") {
      return {
        backgroundColor: theme.background,
        backgroundImage: getPatternCSS(theme),
        backgroundSize: getPatternSize(theme.patternType),
      };
    }
    return { backgroundColor: theme.background };
  };

  const handleDownloadVCard = async (includePhoto: boolean) => {
    try {
      const response = await fetch(`https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/generate-vcard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_id: card.id,
          include_photo: includePhoto,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate vCard");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${card.full_name.replace(/\s+/g, "-")}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(includePhoto ? "Contact saved with photo!" : "Contact saved without photo");
    } catch (error) {
      console.error("Error downloading vCard:", error);
      toast.error("Failed to save contact");
    }
  };

  // Avatar ring gradient derived from ONE editable primary color
  const basePrimary = theme.primary || "#D4AF37";
  const lighterPrimary = adjustHexColor(basePrimary, 30); // +30 brightness
  const darkerPrimary = adjustHexColor(basePrimary, -40); // -40 brightness

  return (
    <Card
      className="overflow-hidden border-0 rounded-xl shadow-lg transition-all duration-500 ease-out"
      style={{
        ...getBackgroundStyle(),
        color: theme?.text || undefined,
        fontFamily: theme?.font ? `"${theme.font}", sans-serif` : undefined,
      }}
    >
      {/* Header with full-bleed cover image with parallax effect */}
      <div
        className="relative w-full h-40 sm:h-48 md:h-56 transition-all duration-500 ease-out overflow-hidden"
        style={{
          backgroundImage:
            !card.cover_url && theme?.primary
              ? `linear-gradient(to bottom right, ${theme.primary}33, ${theme.primary}0D)`
              : undefined,
          backgroundColor: !card.cover_url && !theme?.primary ? "hsl(var(--primary) / 0.2)" : undefined,
        }}
      >
        {card.cover_url && (
          <>
            <img
              src={card.cover_url}
              alt="Cover"
              className="absolute inset-0 h-[120%] w-full object-cover transition-all duration-300 hover:scale-105"
              style={{
                transform: 'translateY(-10%)',
                animation: 'parallax-float 8s ease-in-out infinite alternate',
              }}
            />
            {/* Subtle bottom gradient overlay for contrast */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
          </>
        )}

        {/* Avatar – gradient ring derived from theme.primary with hover glow */}
        <div className="absolute -bottom-12 left-4 z-10">
          <div
            className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 group/avatar"
            style={{
              background: `conic-gradient(from 180deg at 50% 50%, ${lighterPrimary} 0deg, ${basePrimary} 120deg, ${darkerPrimary} 240deg, ${lighterPrimary} 360deg)`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.5)",
            }}
          >
            {/* Hover glow effect */}
            <div 
              className="absolute inset-0 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 blur-xl -z-10"
              style={{
                background: `radial-gradient(circle, ${basePrimary}80 0%, transparent 70%)`,
                transform: 'scale(1.5)',
              }}
            />
            {/* Inner dark plate */}
            <div className="absolute inset-[4px] rounded-full bg-black flex items-center justify-center">
              {/* Inner black edge + photo */}
              <div className="h-[92%] w-[92%] rounded-full overflow-hidden border border-black/80 bg-black flex items-center justify-center">
                {card.avatar_url && (
                  <img src={card.avatar_url} alt={getLiveNameFromCard(card)} className="h-full w-full object-contain" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logo - Bottom Right - Half overlapping the cover */}
        {card.logo_url && (
          <div className="absolute -bottom-8 right-4 h-16 w-28 sm:h-20 sm:w-32 rounded-lg bg-black/90 p-2 shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300 z-10 flex items-center justify-center">
            <img src={card.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-16 pb-4 transition-colors duration-500">
        <h1 className="text-xl sm:text-2xl font-bold transition-colors duration-500">{getLiveNameFromCard(card)}</h1>
        {card.title && (
          <p className="text-sm sm:text-lg opacity-80 mt-1 transition-colors duration-500">{card.title}</p>
        )}
        {card.company && <p className="text-sm text-muted-foreground transition-colors duration-500">{card.company}</p>}
        {card.bio && <p className="mt-3 text-sm text-muted-foreground transition-colors duration-500">{card.bio}</p>}
      </div>

      {/* Product Carousel */}
      {card.carousel_enabled !== false && productImages.length > 0 && (
        <div className="my-4 transition-opacity duration-500">
          <ProductRingCarousel
            images={productImages.map((img) => ({
              id: img.id,
              url: img.image_url,
              alt: img.alt_text || undefined,
              description: img.description || undefined,
            }))}
            autoPlayMs={theme?.carouselSpeed || 4000}
          />
        </div>
      )}

      {/* Social Media Links */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center px-4 pb-4">
          {socialLinks.map((link, index) => {
            const IconComponent = iconMap[link.icon] || Globe;
            const brandColor = socialBrandColors[link.kind] || "bg-primary";
            const bounceDelay = `${index * 0.1}s`;

            if (isInteractive) {
              return (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${brandColor} hover:scale-110 hover:opacity-90 transition-all duration-300 cursor-pointer shadow-md animate-[bounce_0.6s_ease-out]`}
                  style={{ animationDelay: bounceDelay, animationFillMode: 'backwards' }}
                  title={link.label}
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </a>
              );
            }

            return (
              <div
                key={link.id}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${brandColor} hover:scale-110 hover:opacity-90 transition-all duration-300 cursor-pointer shadow-md animate-[bounce_0.6s_ease-out]`}
                style={{ animationDelay: bounceDelay, animationFillMode: 'backwards' }}
                title={link.label}
              >
                <IconComponent className="h-6 w-6 text-white" />
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Buttons */}
      <div className="space-y-3 px-4 pb-4">
        {card.email && (
          <div className="animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
            <ContactButton
              icon={<Mail className="h-6 w-6 text-white" />}
              label={card.email}
              sublabel="Personal"
              colorClass={contactBrandColors.email}
              onClick={isInteractive ? () => window.open(`mailto:${card.email}`) : undefined}
              isInteractive={isInteractive}
            />
          </div>
        )}

        {card.phone && (
          <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
            <ContactButton
              icon={<Phone className="h-6 w-6 text-white" />}
              label={card.phone}
              sublabel="Mobile"
              colorClass={contactBrandColors.phone}
              onClick={isInteractive ? () => window.open(`tel:${card.phone}`) : undefined}
              isInteractive={isInteractive}
            />
          </div>
        )}

        {card.website && (
          <div className="animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
            <ContactButton
              icon={<Globe className="h-6 w-6 text-white" />}
              label={card.website}
              sublabel="Website"
              colorClass={contactBrandColors.website}
              onClick={isInteractive ? () => window.open(card.website!, "_blank") : undefined}
              isInteractive={isInteractive}
            />
          </div>
        )}

        {card.location && (
          <div className="animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
            <div className="flex w-full items-center gap-3 group transition-all duration-300 hover:bg-primary/5 rounded-lg p-2 -ml-2">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${contactBrandColors.location} shadow-md group-hover:scale-110 group-hover:shadow-lg group-hover:rotate-3 transition-all duration-300`}
              >
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 transition-transform duration-300 group-hover:translate-x-1">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors duration-300">{card.location}</p>
                <p className="text-xs text-muted-foreground">Location</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Code */}
      {showQRCode && card.qr_code_url && (
        <div className="flex flex-col items-center gap-3 p-6 transition-colors duration-500">
          <img
            src={card.qr_code_url}
            alt="QR Code"
            className="w-48 h-48 rounded-lg transition-all duration-300"
          />
          <button
            onClick={async () => {
              try {
                const response = await fetch(card.qr_code_url!);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${card.slug}-qr.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Failed to download QR code:', error);
                window.open(card.qr_code_url!, '_blank');
              }
            }}
            className="text-sm text-primary hover:underline flex items-center gap-2 transition-colors duration-300"
          >
            <Download className="h-4 w-4" />
            Download QR Code
          </button>
        </div>
      )}

      {/* Save Contact Button (always show) */}
      <div className="px-4 pb-4 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}>
      {isInteractive && showVCardButtons ? (
          <Button
            className="w-full gap-2 transition-all duration-300 hover:brightness-90 animate-[pulse_2s_ease-in-out_infinite] relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
            style={{
              backgroundColor: theme.buttonColor || theme.primary || "#22c55e",
            }}
            onClick={() => handleDownloadVCard(true)}
          >
            <Download className="h-4 w-4 relative z-10" />
            <span className="relative z-10">Save Contact</span>
          </Button>
        ) : (
          <button
            className="w-full h-14 text-white text-lg font-semibold rounded-full transition-all duration-500 hover:brightness-90 animate-[pulse_2s_ease-in-out_infinite] relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
            style={{
              backgroundColor: theme.buttonColor || theme.primary || "#22c55e",
            }}
          >
            <span className="relative z-10">Save Contact</span>
          </button>
        )}
      </div>
    </Card>
  );
}

interface ContactButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  colorClass: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

function ContactButton({ icon, label, sublabel, colorClass, onClick, isInteractive }: ContactButtonProps) {
  const content = (
    <>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${colorClass} group-hover:scale-110 group-hover:shadow-lg group-hover:rotate-3 transition-all duration-300 shadow-md`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 transition-transform duration-300 group-hover:translate-x-1">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-300">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </>
  );

  if (isInteractive && onClick) {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 text-left group transition-all duration-300 hover:bg-primary/5 rounded-lg p-2 -ml-2"
      >
        {content}
      </button>
    );
  }

  return <div className="flex w-full items-center gap-3 group transition-all duration-300 hover:bg-primary/5 rounded-lg p-2 -ml-2">{content}</div>;
}
