import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import LoadingAnimation from "@/components/LoadingAnimation";
import CardView, { SocialLink, ProductImage } from "@/components/CardView";
import { getGradientCSS, getPatternCSS, getPatternSize } from "@/components/ThemeCustomizer";
import { getActiveTheme, CardTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

type CardData = Tables<"cards">;

interface PublicCardProps {
  customSlug?: boolean;
}

export default function PublicCard({ customSlug = false }: PublicCardProps) {
  const { slug, customSlug: customSlugParam } = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerMode, setViewerMode] = useState<"light" | "dark" | null>(null);

  // Get the effective theme (with A/B variant support)
  const rawTheme = card?.theme as CardTheme | undefined;
  const hasVariants = rawTheme?.variants !== undefined;
  
  // If viewer has selected a mode override, apply it
  const getEffectiveTheme = () => {
    const activeTheme = getActiveTheme(rawTheme);
    
    if (viewerMode && hasVariants) {
      // Find a variant that matches the viewer's preference, or adjust current theme
      const variants = rawTheme?.variants;
      if (variants) {
        // Check if either variant matches the desired mode
        const variantA = variants.A;
        const variantB = variants.B;
        
        const isALight = variantA?.background === "#F8F8F8" || variantA?.text === "#111111";
        const isBLight = variantB?.background === "#F8F8F8" || variantB?.text === "#111111";
        
        if (viewerMode === "light") {
          if (isALight) return { ...activeTheme, ...variantA };
          if (isBLight) return { ...activeTheme, ...variantB };
          // Fallback: just lighten the current theme
          return { ...activeTheme, background: "#F8F8F8", text: "#111111" };
        } else {
          if (!isALight && variantA) return { ...activeTheme, ...variantA };
          if (!isBLight && variantB) return { ...activeTheme, ...variantB };
          // Fallback: darken the current theme
          return { ...activeTheme, background: "#0B0B0C", text: "#F8F8F8" };
        }
      }
    }
    
    return activeTheme;
  };
  
  const theme = getEffectiveTheme();

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
    loadCard();
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
      // Track view through Edge Function (with rate limiting)
      supabase.functions
        .invoke("track-card-event", {
          body: { card_id: data.id, kind: "view" },
        })
        .catch((err) => console.error("Failed to track view:", err));

      // Load social links
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

      // Load product images
      const { data: images } = await supabase
        .from("product_images")
        .select("id, image_url, alt_text, description, sort_order")
        .eq("card_id", data.id)
        .order("sort_order", { ascending: true });

      if (images) {
        setProductImages(images);
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

  return (
    <div
      className="min-h-screen bg-background transition-all duration-500"
      style={{
        ...getBackgroundStyle(),
        fontFamily: theme?.font ? `"${theme.font}", sans-serif` : undefined,
      }}
    >
      {/* Viewer mode toggle (only if card has variants) */}
      {hasVariants && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex gap-1 bg-background/80 backdrop-blur-sm rounded-full p-1 border border-border/50 shadow-lg">
            <Button
              variant={viewerMode === "light" ? "default" : "ghost"}
              size="sm"
              className="rounded-full h-8 w-8 p-0 transition-all duration-300"
              onClick={() => setViewerMode(viewerMode === "light" ? null : "light")}
              title="Light mode"
            >
              <Sun className="h-4 w-4" />
            </Button>
            <Button
              variant={viewerMode === "dark" ? "default" : "ghost"}
              size="sm"
              className="rounded-full h-8 w-8 p-0 transition-all duration-300"
              onClick={() => setViewerMode(viewerMode === "dark" ? null : "dark")}
              title="Dark mode"
            >
              <Moon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="mx-auto max-w-2xl transition-all duration-500">
        <CardView
          card={cardWithEffectiveTheme}
          socialLinks={socialLinks}
          productImages={productImages}
          isInteractive={true}
          showQRCode={true}
          showVCardButtons={true}
        />
      </div>
    </div>
  );
}
