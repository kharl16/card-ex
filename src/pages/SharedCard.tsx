import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import LoadingAnimation from "@/components/LoadingAnimation";
import CardView, { SocialLink, ProductImage, AdditionalContact } from "@/components/CardView";
import { getGradientCSS, getPatternCSS, getPatternSize } from "@/components/ThemeCustomizer";
import { getActiveTheme, CardTheme } from "@/lib/theme";

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

interface ShareLinkData {
  card_id: string;
  is_active: boolean;
}

export default function SharedCard() {
  const { code } = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Get the effective theme (with A/B variant support)
  const rawTheme = (card?.theme ?? null) as unknown as CardTheme | null;
  const theme = getActiveTheme(rawTheme);

  // Apply custom theme colors to document
  useEffect(() => {
    if (theme) {
      if (theme.primary) {
        document.documentElement.style.setProperty("--primary", theme.primary);
      }
      if (theme.background) {
        document.documentElement.style.setProperty("--background", theme.background);
      }
      if (theme.text) {
        document.documentElement.style.setProperty("--foreground", theme.text);
      }
      if (theme.accent) {
        document.documentElement.style.setProperty("--accent", theme.accent);
      }
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
    loadSharedCard();
  }, [code]);

  const loadSharedCard = async () => {
    if (!code) return;

    // Get share link
    const { data: shareLink, error: shareLinkError } = await supabase
      .from("share_links" as any)
      .select("card_id, is_active")
      .eq("code", code)
      .single() as { data: ShareLinkData | null; error: any };

    if (shareLinkError || !shareLink || !shareLink.is_active) {
      setLoading(false);
      return;
    }

    // Get card data
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", shareLink.card_id)
      .eq("is_published", true)
      .single();

    if (!error && data) {
      setCard(data);
      
      // Track view with share code
      supabase.functions.invoke('track-card-event', {
        body: { 
          card_id: data.id, 
          kind: 'view',
          share_code: code 
        }
      }).catch(err => console.error('Failed to track view:', err));
      
      // Load social links
      const { data: links } = await supabase
        .from("card_links")
        .select("*")
        .eq("card_id", data.id)
        .in("kind", ["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok", "url"])
        .order("sort_index");
      
      if (links) {
        setSocialLinks(links.map(link => ({
          id: link.id,
          kind: link.kind,
          label: link.label,
          value: link.value,
          icon: link.icon || "",
        })));
      }

      // Load product images
      const { data: images } = await supabase
        .from("product_images")
        .select("id, image_url, alt_text, description, sort_order")
        .eq("card_id", data.id)
        .order("sort_order", { ascending: true });
      
      if (images) {
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
          <p className="text-muted-foreground">Share link not found or inactive</p>
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

  return (
    <div
      className="min-h-screen bg-background transition-all duration-500"
      style={{
        ...getBackgroundStyle(),
        fontFamily: theme?.font ? `"${theme.font}", sans-serif` : undefined,
      }}
    >
      <div className="mx-auto max-w-2xl transition-all duration-500">
        <CardView
          card={cardWithEffectiveTheme}
          socialLinks={socialLinks}
          productImages={productImages}
          additionalContacts={additionalContacts}
          isInteractive={true}
          showQRCode={true}
          showVCardButtons={true}
        />
      </div>
    </div>
  );
}
