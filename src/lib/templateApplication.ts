import type { TablesUpdate } from "@/integrations/supabase/types";
import type { CardSnapshot } from "@/lib/cardSnapshot";

/** Deliberate design-only allowlist: never copy identity, contact or account fields. */
export function buildTemplateDesignUpdate(snapshot: CardSnapshot): TablesUpdate<"cards"> {
  return {
    theme: snapshot.theme,
    cover_url: snapshot.cover_url ?? null,
    logo_url: snapshot.logo_url ?? null,
    carousel_enabled: snapshot.carousel_enabled ?? true,
    carousel_settings: snapshot.carousel_settings as TablesUpdate<"cards">["carousel_settings"],
    product_images: (snapshot.product_images ?? []) as TablesUpdate<"cards">["product_images"],
    package_images: (snapshot.package_images ?? []) as TablesUpdate<"cards">["package_images"],
    testimony_images: (snapshot.testimony_images ?? []) as TablesUpdate<"cards">["testimony_images"],
    video_items: snapshot.video_items ?? [],
    brochure_images: (snapshot.brochure_images ?? []) as TablesUpdate<"cards">["brochure_images"],
    showcase_display_mode: snapshot.showcase_display_mode ?? "immersive",
    image_carousels: snapshot.image_carousels ?? null,
    show_daily_quote: snapshot.show_daily_quote ?? false,
    show_referral_earnings: snapshot.show_referral_earnings ?? false,
  };
}