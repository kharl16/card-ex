import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import LoadingAnimation from "@/components/LoadingAnimation";
import CardView, { SocialLink, ProductImage, AdditionalContact } from "@/components/CardView";
import { getGradientCSS, getPatternCSS, getPatternSize } from "@/components/ThemeCustomizer";
import { getActiveTheme, CardTheme } from "@/lib/theme";
import { getPublicCardUrl } from "@/lib/cardUrl";
import { toHslTriplet } from "@/lib/color";
import { Button } from "@/components/ui/button";
import { Plus, Download, CalendarDays, Users } from "lucide-react";
import ToolsOrb from "@/components/tools/ToolsOrb";
import AIChatWidget from "@/components/ai/AIChatWidget";
import AppointmentBookingDialog from "@/components/appointments/AppointmentBookingDialog";
import { Link } from "react-router-dom";

type CardData = Tables<"cards">;

type ContactKind = "email" | "phone" | "url" | "custom";
type ContactType = "work" | "home" | "mobile" | "office" | "other";

function inferTypeFromLabel(labelLower: string): ContactType {
  if (labelLower.includes("work")) return "work";
  if (labelLower.includes("home")) return "home";
  if (labelLower.includes("mobile") || labelLower.includes("cell")) return "mobile";
  if (labelLower.includes("office")) return "office";
  return "other";
}

interface PublicCardProps {
  customSlug?: boolean;
}

export default function PublicCard({ customSlug = false }: PublicCardProps) {
  const { slug, customSlug: customSlugParam } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerReferralCode, setOwnerReferralCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  // Get the effective theme (with A/B variant support)
  const rawTheme = (card?.theme ?? null) as unknown as CardTheme | null;
  const theme = getActiveTheme(rawTheme);

  // Apply custom theme colors to document
  useEffect(() => {
    if (theme) {
      // IMPORTANT: shadcn/tailwind tokens expect HSL triplets (e.g. "222.2 47.4% 11.2%"),
      // not hex strings. If we set hex here, buttons (including Share) can become invisible.
      const setHslVar = (name: string, value?: string | null) => {
        if (!value) return;
        const triplet = toHslTriplet(value);
        if (triplet) document.documentElement.style.setProperty(name, triplet);
      };

      setHslVar("--primary", theme.primary);
      setHslVar("--background", theme.background);
      setHslVar("--foreground", theme.text);
      setHslVar("--accent", theme.accent);

      if (theme.font) {
        document.documentElement.style.fontFamily = `"${theme.font}", sans-serif`;
      }
    }

    return () => {
      // Reset to default on unmount
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--background");
      document.documentElement.style.removeProperty("--foreground");
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.fontFamily = "";
    };
  }, [theme]);

  useEffect(() => {
    loadCard();
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
    });
  }, [slug]);

  const loadCard = async () => {
    const slugValue = customSlug ? customSlugParam : slug;
    if (!slugValue) return;

    // Try to load by custom_slug first if customSlug route, otherwise by slug
    const query = supabase.from("cards").select("*").eq("is_published", true);

    const { data, error } = customSlug
      ? await query.eq("custom_slug", slugValue).single()
      : await query.eq("slug", slugValue).single();

    if (!error && data) {
      setCard(data);
      
      // Fetch owner's referral code using the secure database function
      // This works for anonymous users and returns the code only if the owner has referral access
      const { data: referralCodeResult } = await supabase
        .rpc("get_referral_code_for_user", { p_user_id: data.user_id });
      
      if (referralCodeResult) {
        setOwnerReferralCode(referralCodeResult);
      }

      // Check if appointment booking is enabled
      const { data: availSettings } = await supabase
        .from("availability_settings")
        .select("booking_enabled")
        .eq("user_id", data.user_id)
        .maybeSingle();
      
      setBookingEnabled(availSettings?.booking_enabled === true);
      
      // Track view through Edge Function (with rate limiting)
      supabase.functions
        .invoke("track-card-event", {
          body: { card_id: data.id, kind: "view" },
        })
        .catch((err) => console.error("Failed to track view:", err));

      // Load social links from JSON field or fallback to card_links table
      if (data.social_links && Array.isArray(data.social_links)) {
        const socialLinksData = data.social_links as unknown as SocialLink[];
        setSocialLinks(
          socialLinksData.map((link, index) => ({
            id: link.id || `link-${index}`,
            kind: link.kind,
            label: link.label,
            value: link.value,
            icon: link.icon || "",
          }))
        );
      } else {
        // Fallback: load from card_links table for backward compatibility
        const { data: links } = await supabase
          .from("card_links")
          .select("*")
          .eq("card_id", data.id)
          .in("kind", ["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok", "url"])
          .order("sort_index");

        if (links) {
          setSocialLinks(
            links.map((link) => ({
              id: link.id,
              kind: link.kind,
              label: link.label,
              value: link.value,
              icon: link.icon || "",
            }))
          );
        }
      }

      // Load product images from cards.product_images JSONB column
      const rawProductImages = (data as any).product_images;
      if (rawProductImages && Array.isArray(rawProductImages)) {
        const images = rawProductImages.map((img: any, index: number) => ({
          id: `product-${index}`,
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          description: img.description || null,
          sort_order: img.sort_order ?? index,
        }));
        setProductImages(images);
      }

      // Load additional contacts
      const { data: contactLinks } = await supabase
        .from("card_links")
        .select("id, kind, label, value")
        .eq("card_id", data.id)
        .in("kind", ["email", "phone", "url", "custom"])
        .order("sort_index", { ascending: true });

      if (contactLinks) {
        const contacts: AdditionalContact[] = contactLinks
          .filter((link) => {
            const label = (link.label || "").toLowerCase();
            return (
              label.includes("additional") ||
              label.includes("alternate") ||
              label.includes("other") ||
              label.includes("secondary") ||
              label.includes("work") ||
              label.includes("home") ||
              label.includes("mobile") ||
              label.includes("office")
            );
          })
          .map((link) => {
            const rawLabel = link.label || "";
            const labelLower = rawLabel.toLowerCase();
            const contactType = inferTypeFromLabel(labelLower);
            return {
              id: link.id,
              kind: link.kind as ContactKind,
              label: rawLabel,
              value: link.value || "",
              contactType,
            };
          });
        setAdditionalContacts(contacts);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">Card not found</p>
        </div>
      </div>
    );
  }

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

  // Create a modified card object with the effective theme for CardView
  const cardWithEffectiveTheme = {
    ...card,
    theme: theme as any,
  };

  // Handle "Create your own Card-Ex" button click — always go to signup with referral
  const handleCreateCard = () => {
    if (ownerReferralCode) {
      navigate(`/signup?ref=${ownerReferralCode}`);
    } else {
      navigate("/signup");
    }
  };

  const saveButtonColor = theme?.buttonColor || theme?.primary || "#22c55e";

  return (
    <div
      className="min-h-screen bg-background transition-colors duration-500 overflow-x-hidden max-w-[100vw]"
      style={{
        ...getBackgroundStyle(),
        fontFamily: theme?.font ? `"${theme.font}", sans-serif` : undefined,
      }}
    >
      
      <div className="mx-auto max-w-2xl overflow-x-hidden">
        <CardView
          card={cardWithEffectiveTheme}
          socialLinks={socialLinks}
          productImages={productImages}
          additionalContacts={additionalContacts}
          isInteractive={true}
          showQRCode={true}
          showVCardButtons={true}
          publicCardUrl={getPublicCardUrl(card.custom_slug || card.slug)}
        />
        
        {/* Book Appointment Button */}
        {bookingEnabled && (
          <div className="px-4 pt-4">
            <Button
              onClick={() => setBookingDialogOpen(true)}
              className="w-full gap-2 h-12 text-base font-semibold rounded-2xl"
              style={{ backgroundColor: theme?.primary || "#D4AF37" }}
            >
              <CalendarDays className="h-5 w-5" />
              Book Appointment
            </Button>
          </div>
        )}

        {/* Create your own Card-Ex button */}
        <div className="px-4 pb-8 pt-3">
          <Button
            onClick={handleCreateCard}
            variant="outline"
            className="w-full gap-2 h-11 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Create your own Card-Ex
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Get your professional digital business card
          </p>
        </div>

        {/* Bottom spacer for floating FAB */}
        <div className="h-20" />
      </div>

      {/* Floating Save Contact FAB – outside transformed container */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div
          className="mx-auto max-w-2xl px-5 pb-5 pt-3 pointer-events-auto"
          style={{ background: `linear-gradient(to top, ${theme?.background || "hsl(var(--background))"} 70%, transparent)` }}
        >
          <Button
            className="w-full h-12 gap-2 text-base font-semibold rounded-2xl transition-all duration-500 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] relative overflow-hidden glass-shimmer shadow-lg"
            style={{
              backgroundColor: saveButtonColor,
              boxShadow: `0 8px 30px ${saveButtonColor}50, 0 0 0 1px ${saveButtonColor}30`,
              border: "1px solid var(--glass-border)",
              borderTop: "1px solid var(--glass-border-highlight)",
            }}
            onClick={() => {
              // Trigger vcard download via CardView's exposed handler
              const vcardBtn = document.querySelector('[data-vcard-download]') as HTMLButtonElement;
              if (vcardBtn) vcardBtn.click();
            }}
          >
            <Download className="h-5 w-5 relative z-10" />
            <span className="relative z-10 tracking-wider uppercase text-sm">Save Contact</span>
          </Button>
        </div>
      </div>

      <AIChatWidget
        cardId={card.id}
        cardOwnerName={card.full_name}
        accentColor={theme?.primary || "#D4AF37"}
      />
      <ToolsOrb mode="public" cardOwnerId={card?.user_id} />

      {bookingEnabled && card && (
        <AppointmentBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          cardId={card.id}
          cardOwnerUserId={card.user_id}
          cardOwnerName={card.full_name}
          accentColor={theme?.primary || "#D4AF37"}
        />
      )}
    </div>
  );
}
