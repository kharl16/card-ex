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
import CardExCarousel from "@/components/CardExCarousel";
import CarouselSectionRenderer from "@/components/carousel/CarouselSectionRenderer";
import RiderHeader from "@/components/RiderHeader";
import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import { getGradientCSS, getPatternCSS, getPatternSize } from "@/components/ThemeCustomizer";
import { getActiveTheme, CardTheme } from "@/lib/theme";
import { mergeCarouselSettings, type CarouselSettingsData } from "@/lib/carouselTypes";
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

export default function CardView({
  card,
  socialLinks,
  productImages,
  additionalContacts = [],
  isInteractive = false,
  showQRCode = false,
  showVCardButtons = false,
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
      // <– make the whole card a stacking context and avoid clipping
      className="relative border-0 rounded-xl shadow-lg transition-all duration-500 ease-out overflow-visible"
      style={{
        ...getBackgroundStyle(),
        color: theme?.text || undefined,
        fontFamily: theme?.font ? `"${theme.font}", sans-serif` : undefined,
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
        {/* Company and Bio */}
        <div className="px-4 pb-4 transition-colors duration-500">
          {card.company && (
            <p className="text-sm text-muted-foreground transition-colors duration-500">{card.company}</p>
          )}
          {card.bio && <p className="mt-3 text-sm text-muted-foreground transition-colors duration-500">{card.bio}</p>}
        </div>

        {/* Three Carousel Sections */}
        {(() => {
          const carouselSettings = mergeCarouselSettings(
            (card as any).carousel_settings as Partial<CarouselSettingsData> | null
          );
          const contactInfo = { phone: card.phone, email: card.email, website: card.website };

          const normalizeCarouselImages = (raw: any): { url: string; alt?: string; order?: number }[] => {
            if (!raw || !Array.isArray(raw)) return [];

            return raw
              .map((img: any, idx: number) => ({
                url: (typeof img?.url === "string" ? img.url : img?.image_url) as string | undefined,
                alt: (img?.alt ?? img?.alt_text) as string | undefined,
                order: (img?.order ?? img?.sort_order ?? idx) as number,
              }))
              .filter((img) => !!img.url);
          };

          // Extract images from the dedicated JSON columns (supports both legacy shapes)
          const productImagesData = normalizeCarouselImages((card as any).product_images);
          const packageImagesData = normalizeCarouselImages((card as any).package_images);
          const testimonyImagesData = normalizeCarouselImages((card as any).testimony_images);
          
          return (
            <>
              <CarouselSectionRenderer
                carouselKey="products"
                section={carouselSettings.products}
                images={productImagesData}
                contactInfo={contactInfo}
                isInteractive={isInteractive}
                className="mt-2 mb-3"
              />
              <CarouselSectionRenderer
                carouselKey="packages"
                section={carouselSettings.packages}
                images={packageImagesData}
                contactInfo={contactInfo}
                isInteractive={isInteractive}
                className="my-3"
              />
              <CarouselSectionRenderer
                carouselKey="testimonies"
                section={carouselSettings.testimonies}
                images={testimonyImagesData}
                contactInfo={contactInfo}
                isInteractive={isInteractive}
                className="my-3"
              />
            </>
          );
        })()}

        {/* Social Media Links */}
        {resolvedSocialLinks.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center px-4 pb-4">
            {resolvedSocialLinks.map((link, index) => {
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
                    style={{ animationDelay: bounceDelay, animationFillMode: "backwards" }}
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
                  style={{ animationDelay: bounceDelay, animationFillMode: "backwards" }}
                  title={link.label}
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              );
            })}
          </div>
        )}

        {/* Unified Contact Buttons (primary + additional together) */}
        <div className="space-y-3 px-4 pb-4">
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

            // primary contacts
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

            // helpers
            const getTypeLabel = (type: AdditionalContact["contactType"]) => {
              switch (type) {
                case "work":
                  return "Work";
                case "home":
                  return "Home";
                case "mobile":
                  return "Mobile";
                case "office":
                  return "Office";
                default:
                  return "Other";
              }
            };

            const getContactIcon = (kind: AdditionalContact["kind"]) => {
              switch (kind) {
                case "email":
                  return <Mail className="h-6 w-6 text-white" />;
                case "phone":
                  return <Phone className="h-6 w-6 text-white" />;
                case "url":
                  return <Globe className="h-6 w-6 text-white" />;
                case "custom":
                default:
                  return <MapPin className="h-6 w-6 text-white" />;
              }
            };

            const getContactColor = (kind: AdditionalContact["kind"]) => {
              switch (kind) {
                case "email":
                  return contactBrandColors.email;
                case "phone":
                  return contactBrandColors.phone;
                case "url":
                  return contactBrandColors.website;
                case "custom":
                default:
                  return contactBrandColors.location;
              }
            };

            const getHref = (kind: AdditionalContact["kind"], value: string) => {
              if (!value) return undefined;
              switch (kind) {
                case "email":
                  return `mailto:${value}`;
                case "phone":
                  return `tel:${value}`;
                case "url":
                  return value;
                default:
                  return undefined;
              }
            };

            // additional contacts
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

            // sort contacts
            const kindRank = (kind: CombinedKind) => {
              switch (kind) {
                case "email":
                  return 1;
                case "phone":
                  return 2;
                case "url":
                  return 3;
                case "custom":
                default:
                  return 4;
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

            // render contacts
            return contacts.map((item, index) => {
              const delay = 0.1 + index * 0.1;

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
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${delay}s`,
                    animationFillMode: "backwards",
                  }}
                >
                  <ContactButton
                    icon={item.icon}
                    label={item.label}
                    sublabel={item.sublabel}
                    colorClass={item.colorClass}
                    onClick={handleClick}
                    isInteractive={isInteractive}
                  />
                </div>
              );
            });
          })()}
        </div>

        {/* QR Code */}
        {showQRCode && card.public_url && (
          <div className="flex flex-col items-center gap-3 p-6 transition-colors duration-500">
            <QRCodeDisplay
              url={card.public_url}
              settings={theme?.qr}
              size={192}
              className="transition-all duration-300"
              showDownload={isInteractive}
              downloadFileName={`${card.full_name?.replace(/\s+/g, "-") || "card"}-qr`}
            />
            <p className="text-xs text-muted-foreground">Scan to view this card</p>
          </div>
        )}

        {/* Save Contact Button (always show) */}
        <div className="px-4 pb-4 animate-fade-in" style={{ animationDelay: "0.5s", animationFillMode: "backwards" }}>
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
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-300">
          {label}
        </p>
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

  return (
    <div className="flex w-full items-center gap-3 group transition-all duration-300 hover:bg-primary/5 rounded-lg p-2 -ml-2">
      {content}
    </div>
  );
}
