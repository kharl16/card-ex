import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Download,
  Facebook,
  Linkedin,
  Youtube,
  Github,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CardExCarousel from "@/components/CardExCarousel";
import CarouselSectionRenderer from "@/components/carousel/CarouselSectionRenderer";
import VideoSectionRenderer from "@/components/video/VideoSectionRenderer";
import RiderHeader from "@/components/RiderHeader";
import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import { getGradientCSS, getPatternCSS, getPatternSize } from "@/components/ThemeCustomizer";
import { getActiveTheme, CardTheme } from "@/lib/theme";
import { mergeCarouselSettings, type CarouselSettingsData } from "@/lib/carouselTypes";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Custom social icons
import tiktokIcon from "@/assets/icons/tiktok.png";
import instagramIcon from "@/assets/icons/instagram.png";
import twitterXIcon from "@/assets/icons/twitter-x.png";
import telegramIcon from "@/assets/icons/telegram.png";

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
  /** If true, renders interactive elements (links, download buttons). False for preview. */
  isInteractive?: boolean;
  /** If true, shows the QR code section */
  showQRCode?: boolean;
  /** If true, shows the vCard download buttons */
  showVCardButtons?: boolean;
  /** Public card URL for sharing - must be https://tagex.app/c/{slug}, never editor URL */
  publicCardUrl?: string;
}

const iconMap: Record<string, any> = {
  Facebook,
  Linkedin,
  Youtube,
  Github,
  Globe,
};

// Custom PNG icons for platforms without white backgrounds
const customIconMap: Record<string, string> = {
  Instagram: instagramIcon,
  Twitter: twitterXIcon,
  MessageCircle: telegramIcon,
  Music: tiktokIcon,
};

// Brand colors and glow effects for social platforms
const socialBrandConfig: Record<string, { bg: string; glow: string }> = {
  facebook: { 
    bg: "bg-[#1877F2]", 
    glow: "hover:shadow-[0_0_20px_rgba(24,119,242,0.6)]" 
  },
  linkedin: { 
    bg: "bg-[#0A66C2]", 
    glow: "hover:shadow-[0_0_20px_rgba(10,102,194,0.5)]" 
  },
  instagram: { 
    bg: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FD1D1D]", 
    glow: "hover:shadow-[0_0_24px_rgba(225,48,108,0.6)]" 
  },
  x: { 
    bg: "bg-black", 
    glow: "hover:shadow-[0_0_16px_rgba(255,255,255,0.25)]" 
  },
  youtube: { 
    bg: "bg-[#FF0000]", 
    glow: "hover:shadow-[0_0_20px_rgba(255,0,0,0.5)]" 
  },
  telegram: { 
    bg: "bg-[#26A5E4]", 
    glow: "hover:shadow-[0_0_20px_rgba(38,165,228,0.6)]" 
  },
  tiktok: { 
    bg: "bg-black", 
    glow: "hover:shadow-[0_0_20px_rgba(0,255,255,0.4),0_0_20px_rgba(255,0,80,0.4)]" 
  },
  url: { 
    bg: "bg-[#4285F4]", 
    glow: "hover:shadow-[0_0_16px_rgba(66,133,244,0.5)]" 
  },
};

// Legacy accessor for brand colors only
const socialBrandColors: Record<string, string> = Object.fromEntries(
  Object.entries(socialBrandConfig).map(([k, v]) => [k, v.bg])
);

const contactBrandColors: Record<string, string> = {
  email: "bg-[#EA4335]",
  phone: "bg-[#34A853]",
  website: "bg-[#4285F4]",
  location: "bg-[#FBBC04]",
};

export default function CardView({
  card,
  socialLinks,
  productImages,
  additionalContacts = [],
  isInteractive = false,
  showQRCode = false,
  showVCardButtons = false,
  publicCardUrl,
}: CardViewProps) {
  // Normalize social links whether passed as a prop or loaded from Supabase JSON
  const resolvedSocialLinks: SocialLink[] = React.useMemo(() => {
    // If socialLinks prop exists and has items, use it
    if (socialLinks && socialLinks.length > 0) {
      return socialLinks;
    }

    // Otherwise read from Supabase column card.social_links
    const raw = (card as any).social_links;

    if (!raw) return [];

    // Supabase returns parsed JSON (array)
    if (Array.isArray(raw)) {
      return raw as SocialLink[];
    }

    // If stored as string JSON
    try {
      return JSON.parse(raw) as SocialLink[];
    } catch {
      console.warn("Could not parse card.social_links JSON:", raw);
      return [];
    }
  }, [card, socialLinks]);

  // Use getActiveTheme for A/B variant support
  const theme = getActiveTheme((card.theme ?? null) as unknown as CardTheme | null) || {
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

  // Primary color for RiderHeader gradient ring
  const basePrimary = theme.primary || "#D4AF37";

  return (
    <Card
      className="relative border-0 rounded-2xl shadow-luxury transition-all duration-500 ease-out overflow-visible"
      style={{
        ...getBackgroundStyle(),
        color: theme?.text || undefined,
        fontFamily: theme?.font ? `"${theme.font}", sans-serif` : undefined,
        boxShadow: `var(--shadow-luxury), 0 0 0 1px ${basePrimary}15`,
      }}
    >
      {/* Header using RiderHeader component */}
      <RiderHeader
        coverUrl={card.cover_url}
        avatarUrl={card.avatar_url}
        companyLogoUrl={card.logo_url}
        name={getLiveNameFromCard(card)}
        title={card.title || undefined}
        primaryColor={basePrimary}
        avatarDisplayMode={theme.avatarDisplayMode}
        logoDisplayMode={theme.logoDisplayMode}
      />

      {/* Everything below the header – normal stacking, avatar/logo stay above because of z-index in RiderHeader */}
      <div className="relative z-0">
        {/* Company and Bio – Glassmorphic Card */}
        {(card.company || card.bio) && (
          <div className="px-6 pb-4 transition-colors duration-500">
            <div
              className="rounded-2xl p-4 animate-slide-up-fade"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(var(--glass-blur))",
                WebkitBackdropFilter: "blur(var(--glass-blur))",
                border: "1px solid var(--glass-border)",
              }}
            >
              {card.company && (
                <p className="text-xs text-muted-foreground tracking-widest uppercase font-light" style={{ letterSpacing: "0.12em" }}>{card.company}</p>
              )}
              {card.bio && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.bio}</p>}
            </div>
          </div>
        )}

        {/* Carousel Sections */}
        {(() => {
          const carouselSettings = mergeCarouselSettings(
            (card as any).carousel_settings as Partial<CarouselSettingsData> | null
          );
          const contactInfo = { phone: card.phone, email: card.email, website: card.website };

          const normalizeCarouselImages = (raw: any): { url: string; alt?: string; order?: number; description?: string; shareText?: string }[] => {
            if (!raw || !Array.isArray(raw)) return [];

            return raw
              .map((img: any, idx: number) => ({
                url: (typeof img?.url === "string" ? img.url : img?.image_url) as string | undefined,
                alt: (img?.alt ?? img?.alt_text ?? img?.title ?? img?.name) as string | undefined,
                order: (img?.order ?? img?.sort_order ?? idx) as number,
                description: (img?.description ?? img?.desc) as string | undefined,
                shareText: (img?.shareText ?? img?.share_text ?? img?.caption) as string | undefined,
              }))
              .filter((img) => !!img.url);
          };

          const productImagesData = normalizeCarouselImages((card as any).product_images);
          const packageImagesData = normalizeCarouselImages((card as any).package_images);
          const testimonyImagesData = normalizeCarouselImages((card as any).testimony_images);
          const videoItems = Array.isArray((card as any).video_items) ? (card as any).video_items : [];
          const cardSlug = card.slug;
          
          return (
            <>
              {productImagesData.length > 0 && (
                <div className="px-6 mt-2 mb-1">
                  <CarouselSectionRenderer
                    carouselKey="products"
                    section={carouselSettings.products}
                    images={productImagesData}
                    contactInfo={contactInfo}
                    isInteractive={isInteractive}
                    shareUrl={publicCardUrl}
                    cardSlug={cardSlug}
                  />
                </div>
              )}
              {packageImagesData.length > 0 && (
                <div className="px-6 my-1">
                  <CarouselSectionRenderer
                    carouselKey="packages"
                    section={carouselSettings.packages}
                    images={packageImagesData}
                    contactInfo={contactInfo}
                    isInteractive={isInteractive}
                    shareUrl={publicCardUrl}
                    cardSlug={cardSlug}
                  />
                </div>
              )}
              {testimonyImagesData.length > 0 && (
                <div className="px-6 my-1">
                  <CarouselSectionRenderer
                    carouselKey="testimonies"
                    section={carouselSettings.testimonies}
                    images={testimonyImagesData}
                    contactInfo={contactInfo}
                    isInteractive={isInteractive}
                    shareUrl={publicCardUrl}
                    cardSlug={cardSlug}
                  />
                </div>
              )}
              {videoItems.length > 0 && (
                <div className="px-6 my-1">
                  <VideoSectionRenderer
                    section={carouselSettings.videos}
                    videos={videoItems}
                    contactInfo={contactInfo}
                    isInteractive={isInteractive}
                    shareUrl={publicCardUrl}
                  />
                </div>
              )}
            </>
          );
        })()}

        {/* Gold Divider + Section Label before Social Links */}
        {resolvedSocialLinks.length > 0 && (
          <div className="px-6 pt-3 pb-1">
            <div className="h-[3px] w-full animate-gold-pulse rounded-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${basePrimary}80 30%, ${basePrimary} 50%, ${basePrimary}80 70%, transparent 100%)`, boxShadow: `0 0 8px ${basePrimary}60, 0 0 20px ${basePrimary}30` }} />
            <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-center mt-3 mb-1" style={{ background: `linear-gradient(135deg, ${basePrimary}, #ffffff80)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Connect</p>
          </div>
        )}

        {/* Social Media Links */}
        {resolvedSocialLinks.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center px-6 pb-3">
            {resolvedSocialLinks.map((link, index) => {
              const IconComponent = iconMap[link.icon];
              const customIconSrc = customIconMap[link.icon];
              const brandConfig = socialBrandConfig[link.kind] || { bg: "bg-primary", glow: "hover:shadow-[0_0_16px_rgba(212,175,55,0.5)]" };
              const bounceDelay = `${index * 0.08}s`;

              const iconContainerClasses = `
                flex h-12 w-12 items-center justify-center rounded-full 
                ${brandConfig.bg} ${brandConfig.glow}
                hover:scale-110 active:scale-95 active:opacity-80
                transition-all duration-300 ease-out
                cursor-pointer shadow-lg
                animate-slide-up-fade
              `.trim().replace(/\s+/g, ' ');

              const renderIcon = () => {
                if (customIconSrc) {
                  return <img src={customIconSrc} alt={link.label} className="h-6 w-6 object-contain" />;
                }
                const Icon = IconComponent || Globe;
                return <Icon className="h-6 w-6 text-white" />;
              };

              if (isInteractive) {
                return (
                  <a
                    key={link.id}
                    href={link.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={iconContainerClasses}
                    style={{ animationDelay: bounceDelay }}
                    title={link.label}
                  >
                    {renderIcon()}
                  </a>
                );
              }

              return (
                <div
                  key={link.id}
                  className={iconContainerClasses}
                  style={{ animationDelay: bounceDelay }}
                  title={link.label}
                >
                  {renderIcon()}
                </div>
              );
            })}
          </div>
        )}

        {/* Unified Contact Buttons (primary + additional together) */}
        {(card.email || card.phone || card.website || card.location || additionalContacts.length > 0) && (
          <>
            {/* Gold Divider + Section Label before Contacts */}
            <div className="px-6 pt-3 pb-1">
              <div className="h-[3px] w-full animate-gold-pulse rounded-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${basePrimary}80 30%, ${basePrimary} 50%, ${basePrimary}80 70%, transparent 100%)`, boxShadow: `0 0 8px ${basePrimary}60, 0 0 20px ${basePrimary}30` }} />
              <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-center mt-3 mb-1" style={{ background: `linear-gradient(135deg, ${basePrimary}, #ffffff80)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Contact</p>
            </div>
            <div className="px-6 pb-3">
            {(() => {
              type CombinedKind = "email" | "phone" | "url" | "custom";

              interface CombinedContact {
                id: string;
                source: "primary" | "additional";
                kind: CombinedKind;
                label: string;
                sublabel: string;
                icon: React.ReactNode;
                colorClass: string;
                href?: string;
                additionalIndex?: number;
              }

              const contacts: CombinedContact[] = [];

              if (card.email) {
                contacts.push({
                  id: "primary-email",
                  source: "primary",
                  kind: "email",
                  label: card.email,
                  sublabel: "Personal",
                  icon: <Mail className="h-6 w-6 text-white" />,
                  colorClass: contactBrandColors.email,
                  href: `mailto:${card.email}`,
                });
              }

              if (card.phone) {
                contacts.push({
                  id: "primary-phone",
                  source: "primary",
                  kind: "phone",
                  label: card.phone,
                  sublabel: "Mobile",
                  icon: <Phone className="h-6 w-6 text-white" />,
                  colorClass: contactBrandColors.phone,
                  href: `tel:${card.phone}`,
                });
              }

              if (card.website) {
                contacts.push({
                  id: "primary-website",
                  source: "primary",
                  kind: "url",
                  label: card.website,
                  sublabel: "Website",
                  icon: <Globe className="h-6 w-6 text-white" />,
                  colorClass: contactBrandColors.website,
                  href: card.website,
                });
              }

              if (card.location) {
                contacts.push({
                  id: "primary-location",
                  source: "primary",
                  kind: "custom",
                  label: card.location,
                  sublabel: "Location",
                  icon: <MapPin className="h-6 w-6 text-white" />,
                  colorClass: contactBrandColors.location,
                });
              }

              const getTypeLabel = (type: AdditionalContact["contactType"]) => {
                switch (type) {
                  case "work": return "Work";
                  case "home": return "Home";
                  case "mobile": return "Mobile";
                  case "office": return "Office";
                  default: return "Other";
                }
              };

              const getContactIcon = (kind: AdditionalContact["kind"]) => {
                switch (kind) {
                  case "email": return <Mail className="h-6 w-6 text-white" />;
                  case "phone": return <Phone className="h-6 w-6 text-white" />;
                  case "url": return <Globe className="h-6 w-6 text-white" />;
                  default: return <MapPin className="h-6 w-6 text-white" />;
                }
              };

              const getContactColor = (kind: AdditionalContact["kind"]) => {
                switch (kind) {
                  case "email": return contactBrandColors.email;
                  case "phone": return contactBrandColors.phone;
                  case "url": return contactBrandColors.website;
                  default: return contactBrandColors.location;
                }
              };

              const getHref = (kind: AdditionalContact["kind"], value: string) => {
                if (!value) return undefined;
                switch (kind) {
                  case "email": return `mailto:${value}`;
                  case "phone": return `tel:${value}`;
                  case "url": return value;
                  default: return undefined;
                }
              };

              additionalContacts.forEach((contact, index) => {
                if (!contact.value) return;
                contacts.push({
                  id: contact.id,
                  source: "additional",
                  kind: contact.kind,
                  label: contact.value,
                  sublabel: getTypeLabel(contact.contactType),
                  icon: getContactIcon(contact.kind),
                  colorClass: getContactColor(contact.kind),
                  href: getHref(contact.kind, contact.value),
                  additionalIndex: index,
                });
              });

              const kindRank = (kind: CombinedKind) => {
                switch (kind) {
                  case "email": return 1;
                  case "phone": return 2;
                  case "url": return 3;
                  default: return 4;
                }
              };

              contacts.sort((a, b) => {
                const kd = kindRank(a.kind) - kindRank(b.kind);
                if (kd !== 0) return kd;
                const sd = (a.source === "primary" ? 0 : 1) - (b.source === "primary" ? 0 : 1);
                if (sd !== 0) return sd;
                if (a.source === "additional" && b.source === "additional") {
                  return (a.additionalIndex ?? 0) - (b.additionalIndex ?? 0);
                }
                return 0;
              });

              return (
                <div className="grid grid-cols-2 gap-2.5">
                  {contacts.map((item, index) => {
                    const delay = 0.08 + index * 0.08;
                    const handleClick =
                      isInteractive && item.href
                        ? () => {
                            if (item.kind === "url") {
                              window.open(item.href, "_blank");
                            } else {
                              window.open(item.href);
                            }
                          }
                        : undefined;

                    return (
                      <div
                        key={item.id}
                        className="animate-slide-up-fade"
                        style={{ animationDelay: `${delay}s`, animationFillMode: "backwards" }}
                      >
                        <ContactTile
                          icon={item.icon}
                          label={item.label}
                          sublabel={item.sublabel}
                          colorClass={item.colorClass}
                          onClick={handleClick}
                          isInteractive={isInteractive}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          </>
        )}

        {/* QR Code */}
        {showQRCode && card.public_url && (
          <>
            <div className="px-6 py-3">
              <div className="h-[3px] w-full animate-gold-pulse rounded-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${basePrimary}80 30%, ${basePrimary} 50%, ${basePrimary}80 70%, transparent 100%)`, boxShadow: `0 0 8px ${basePrimary}60, 0 0 20px ${basePrimary}30` }} />
            </div>
            <div className="px-6 flex flex-col items-center gap-3 py-2 transition-colors duration-500">
              <QRCodeDisplay
                url={card.public_url}
                settings={theme?.qr}
                size={192}
                className="transition-all duration-300"
                showDownload={isInteractive}
                downloadFileName={`${card.full_name?.replace(/\s+/g, "-") || "card"}-qr`}
              />
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-light">Scan to view this card</p>
            </div>
          </>
        )}

        {/* Bottom padding */}
        <div className="h-6" />
      </div>

      {/* Save Contact Button – inline at bottom of card */}
      <div className="px-5 pb-5 pt-1">
        {isInteractive && showVCardButtons ? (
          <Button
            className="w-full h-12 gap-2 text-base font-semibold rounded-2xl transition-all duration-500 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
            style={{
              backgroundColor: theme.buttonColor || theme.primary || "#22c55e",
              boxShadow: `0 8px 30px ${(theme.buttonColor || theme.primary || "#22c55e")}50, 0 0 0 1px ${(theme.buttonColor || theme.primary || "#22c55e")}30`,
            }}
            onClick={() => handleDownloadVCard(true)}
          >
            <Download className="h-5 w-5 relative z-10" />
            <span className="relative z-10 tracking-wider uppercase text-sm">Save Contact</span>
          </Button>
        ) : (
          <button
            className="w-full h-12 text-white text-base font-semibold rounded-2xl transition-all duration-500 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
            style={{
              backgroundColor: theme.buttonColor || theme.primary || "#22c55e",
              boxShadow: `0 8px 30px ${(theme.buttonColor || theme.primary || "#22c55e")}50, 0 0 0 1px ${(theme.buttonColor || theme.primary || "#22c55e")}30`,
            }}
          >
            <span className="relative z-10 tracking-wider uppercase text-sm">Save Contact</span>
          </button>
        )}
      </div>
    </Card>
  );
}

interface ContactTileProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  colorClass: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

function ContactTile({ icon, label, sublabel, colorClass, onClick, isInteractive }: ContactTileProps) {
  const content = (
    <div className="flex flex-col items-center gap-2 py-3 px-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass} group-hover:scale-110 transition-all duration-300 shadow-md`}
      >
        {icon}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="text-[11px] text-muted-foreground tracking-[0.15em] uppercase font-medium mb-0.5">{sublabel}</p>
        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors duration-300">
          {label}
        </p>
      </div>
    </div>
  );

  const wrapperClasses = "group w-full rounded-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer";
  const wrapperStyle: React.CSSProperties = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    border: "1px solid var(--glass-border)",
  };

  if (isInteractive && onClick) {
    return (
      <button onClick={onClick} className={wrapperClasses} style={wrapperStyle}>
        {content}
      </button>
    );
  }

  return (
    <div className={wrapperClasses} style={wrapperStyle}>
      {content}
    </div>
  );
}
