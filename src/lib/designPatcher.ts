/**
 * Design Patcher - Core logic for applying template designs to existing cards
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json } from "@/integrations/supabase/types";
import type { PatchOptionsState } from "@/components/patcher/PatchOptions";

type CardTemplate = Tables<"card_templates">;
type CardData = Tables<"cards">;

interface LayoutData {
  theme?: Record<string, any>;
  carousel_settings?: Record<string, any>;
  product_images?: Array<{ url: string; alt?: string; order?: number }>;
  package_images?: Array<{ url: string; alt?: string; order?: number }>;
  testimony_images?: Array<{ url: string; alt?: string; order?: number }>;
  card_links?: any[];
  social_links?: any[];
}

export interface PatchResult {
  successIds: string[];
  failedIds: string[];
  errors: Array<{ cardId: string; message: string }>;
  patchId: string;
}

interface ExecutePatchParams {
  template: CardTemplate;
  cards: CardData[];
  options: PatchOptionsState;
  targetMode: "selected" | "all";
  adminUserId: string;
  onProgress?: (current: number, total: number, status: string) => void;
}

const BATCH_SIZE = 20;

/**
 * Build the update payload for a single card based on patch options
 */
function buildPatchPayload(
  template: CardTemplate,
  card: CardData,
  options: PatchOptionsState
): Record<string, any> {
  const layout = template.layout_data as unknown as LayoutData;
  const templateTheme = layout?.theme || {};
  const templateCarouselSettings = layout?.carousel_settings || {};
  const cardTheme = (card.theme as Record<string, any>) || {};
  const cardCarouselSettings = (card.carousel_settings as Record<string, any>) || {};
  
  const payload: Record<string, any> = {};
  
  // Theme & Background
  if (options.theme) {
    const newTheme = { ...cardTheme };
    
    // Copy core theme properties
    if (templateTheme.name) newTheme.name = templateTheme.name;
    if (templateTheme.primary) newTheme.primary = templateTheme.primary;
    if (templateTheme.background) newTheme.background = templateTheme.background;
    if (templateTheme.text) newTheme.text = templateTheme.text;
    if (templateTheme.accent) newTheme.accent = templateTheme.accent;
    
    // Background settings
    if (templateTheme.backgroundType) newTheme.backgroundType = templateTheme.backgroundType;
    if (templateTheme.gradientStart) newTheme.gradientStart = templateTheme.gradientStart;
    if (templateTheme.gradientEnd) newTheme.gradientEnd = templateTheme.gradientEnd;
    if (templateTheme.gradientAngle) newTheme.gradientAngle = templateTheme.gradientAngle;
    if (templateTheme.patternOpacity !== undefined) newTheme.patternOpacity = templateTheme.patternOpacity;
    if (templateTheme.patternColor) newTheme.patternColor = templateTheme.patternColor;
    
    payload.theme = newTheme;
  }
  
  // Typography / Fonts
  if (options.fonts) {
    const newTheme = payload.theme || { ...cardTheme };
    if (templateTheme.fontFamily) newTheme.fontFamily = templateTheme.fontFamily;
    if (templateTheme.headingFont) newTheme.headingFont = templateTheme.headingFont;
    if (templateTheme.bodyFont) newTheme.bodyFont = templateTheme.bodyFont;
    payload.theme = newTheme;
  }
  
  // Button Styles
  if (options.buttonStyles) {
    const newTheme = payload.theme || { ...cardTheme };
    if (templateTheme.buttonStyle) newTheme.buttonStyle = templateTheme.buttonStyle;
    if (templateTheme.buttonRadius) newTheme.buttonRadius = templateTheme.buttonRadius;
    if (templateTheme.ctaStyle) newTheme.ctaStyle = templateTheme.ctaStyle;
    payload.theme = newTheme;
  }
  
  // Layout Config
  if (options.layoutConfig) {
    const newTheme = payload.theme || { ...cardTheme };
    if (templateTheme.headerLayout) newTheme.headerLayout = templateTheme.headerLayout;
    if (templateTheme.sectionSpacing) newTheme.sectionSpacing = templateTheme.sectionSpacing;
    if (templateTheme.cardPadding) newTheme.cardPadding = templateTheme.cardPadding;
    if (templateTheme.displayMode) newTheme.displayMode = templateTheme.displayMode;
    payload.theme = newTheme;
  }
  
  // QR Theme
  if (options.qrTheme) {
    const newTheme = payload.theme || { ...cardTheme };
    if (templateTheme.qrSettings) {
      newTheme.qrSettings = { 
        ...newTheme.qrSettings,
        ...templateTheme.qrSettings,
        // Don't copy the actual QR data/URL - those are card-specific
        data: newTheme.qrSettings?.data,
        url: newTheme.qrSettings?.url,
      };
    }
    payload.theme = newTheme;
  }
  
  // QR Container
  if (options.qrContainer) {
    const newTheme = payload.theme || { ...cardTheme };
    if (templateTheme.qrContainerStyle) newTheme.qrContainerStyle = templateTheme.qrContainerStyle;
    payload.theme = newTheme;
  }
  
  // Carousel Settings - Products
  if (options.carouselProducts.settings) {
    const newSettings = payload.carousel_settings || { ...cardCarouselSettings };
    if (templateCarouselSettings.products) {
      newSettings.products = {
        ...newSettings.products,
        ...templateCarouselSettings.products,
      };
    }
    payload.carousel_settings = newSettings;
  }
  
  // Carousel Settings - Packages
  if (options.carouselPackages.settings) {
    const newSettings = payload.carousel_settings || { ...cardCarouselSettings };
    if (templateCarouselSettings.packages) {
      newSettings.packages = {
        ...newSettings.packages,
        ...templateCarouselSettings.packages,
      };
    }
    payload.carousel_settings = newSettings;
  }
  
  // Carousel Settings - Testimonies
  if (options.carouselTestimonies.settings) {
    const newSettings = payload.carousel_settings || { ...cardCarouselSettings };
    if (templateCarouselSettings.testimonies) {
      newSettings.testimonies = {
        ...newSettings.testimonies,
        ...templateCarouselSettings.testimonies,
      };
    }
    payload.carousel_settings = newSettings;
  }
  
  // Product Images
  if (options.carouselProducts.images.apply) {
    const templateImages = layout?.product_images || [];
    const cardImages = (card.product_images as any[]) || [];
    
    if (options.carouselProducts.images.mode === "overwrite") {
      payload.product_images = templateImages;
    } else if (options.carouselProducts.images.mode === "merge") {
      // Merge: add template images, dedupe by URL
      const existingUrls = new Set(cardImages.map((img: any) => img.url || img.image_url));
      const newImages = templateImages.filter(img => !existingUrls.has(img.url));
      payload.product_images = [...cardImages, ...newImages];
    }
  }
  
  // Package Images
  if (options.carouselPackages.images.apply) {
    const templateImages = layout?.package_images || [];
    const cardImages = (card.package_images as any[]) || [];
    
    if (options.carouselPackages.images.mode === "overwrite") {
      payload.package_images = templateImages;
    } else if (options.carouselPackages.images.mode === "merge") {
      const existingUrls = new Set(cardImages.map((img: any) => img.url || img.image_url));
      const newImages = templateImages.filter(img => !existingUrls.has(img.url));
      payload.package_images = [...cardImages, ...newImages];
    }
  }
  
  // Testimony Images
  if (options.carouselTestimonies.images.apply) {
    const templateImages = layout?.testimony_images || [];
    const cardImages = (card.testimony_images as any[]) || [];
    
    if (options.carouselTestimonies.images.mode === "overwrite") {
      payload.testimony_images = templateImages;
    } else if (options.carouselTestimonies.images.mode === "merge") {
      const existingUrls = new Set(cardImages.map((img: any) => img.url || img.image_url));
      const newImages = templateImages.filter(img => !existingUrls.has(img.url));
      payload.testimony_images = [...cardImages, ...newImages];
    }
  }
  
  // Social Link Styling
  if (options.socialLinkStyling) {
    const newTheme = payload.theme || { ...cardTheme };
    if (templateTheme.socialLinkStyle) newTheme.socialLinkStyle = templateTheme.socialLinkStyle;
    if (templateTheme.socialIconSize) newTheme.socialIconSize = templateTheme.socialIconSize;
    payload.theme = newTheme;
  }
  
  // Social Links Merge/Overwrite
  if (options.socialLinksOverwrite && layout?.social_links) {
    payload.social_links = layout.social_links;
  } else if (options.socialLinksMerge && layout?.social_links) {
    const cardLinks = (card.social_links as any[]) || [];
    const templateLinks = layout.social_links || [];
    const existingKinds = new Set(cardLinks.map((l: any) => l.kind));
    const newLinks = templateLinks.filter((l: any) => !existingKinds.has(l.kind));
    payload.social_links = [...cardLinks, ...newLinks];
  }
  
  // Section Headers
  if (options.sectionHeaders) {
    const newSettings = payload.carousel_settings || { ...cardCarouselSettings };
    if (templateCarouselSettings.products?.label) {
      newSettings.products = { ...newSettings.products, label: templateCarouselSettings.products.label };
    }
    if (templateCarouselSettings.packages?.label) {
      newSettings.packages = { ...newSettings.packages, label: templateCarouselSettings.packages.label };
    }
    if (templateCarouselSettings.testimonies?.label) {
      newSettings.testimonies = { ...newSettings.testimonies, label: templateCarouselSettings.testimonies.label };
    }
    payload.carousel_settings = newSettings;
  }
  
  // Section Visibility
  if (options.sectionVisibility) {
    const newSettings = payload.carousel_settings || { ...cardCarouselSettings };
    if (templateCarouselSettings.products?.showWhenEmpty !== undefined) {
      newSettings.products = { ...newSettings.products, showWhenEmpty: templateCarouselSettings.products.showWhenEmpty };
    }
    if (templateCarouselSettings.packages?.showWhenEmpty !== undefined) {
      newSettings.packages = { ...newSettings.packages, showWhenEmpty: templateCarouselSettings.packages.showWhenEmpty };
    }
    if (templateCarouselSettings.testimonies?.showWhenEmpty !== undefined) {
      newSettings.testimonies = { ...newSettings.testimonies, showWhenEmpty: templateCarouselSettings.testimonies.showWhenEmpty };
    }
    payload.carousel_settings = newSettings;
  }
  
  return payload;
}

/**
 * Execute a design patch operation
 */
export async function executePatch({
  template,
  cards,
  options,
  targetMode,
  adminUserId,
  onProgress,
}: ExecutePatchParams): Promise<PatchResult> {
  const successIds: string[] = [];
  const failedIds: string[] = [];
  const errors: Array<{ cardId: string; message: string }> = [];
  const beforeStates: Record<string, any> = {};
  
  // Create patch record first
  const { data: patchRecord, error: patchError } = await supabase
    .from("admin_patches")
    .insert({
      admin_user_id: adminUserId,
      template_id: template.id,
      target_mode: targetMode,
      target_card_ids: cards.map(c => c.id) as unknown as Json,
      patch_options: options as unknown as Json,
      snapshot_template: template.layout_data,
      cards_affected: cards.length,
      status: "in_progress",
    })
    .select()
    .single();
  
  if (patchError || !patchRecord) {
    throw new Error("Failed to create patch record");
  }
  
  const patchId = patchRecord.id;
  
  try {
    // Process in batches
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (card) => {
          try {
            // Store before state for rollback
            beforeStates[card.id] = {
              theme: card.theme,
              carousel_settings: card.carousel_settings,
              product_images: card.product_images,
              package_images: card.package_images,
              testimony_images: card.testimony_images,
              social_links: card.social_links,
              design_version: card.design_version,
            };
            
            // Build and apply patch
            const payload = buildPatchPayload(template, card, options);
            payload.design_version = (card.design_version || 0) + 1;
            payload.last_design_patch_id = patchId;
            
            const { error } = await supabase
              .from("cards")
              .update(payload)
              .eq("id", card.id);
            
            if (error) {
              failedIds.push(card.id);
              errors.push({ cardId: card.id, message: error.message });
            } else {
              successIds.push(card.id);
            }
          } catch (err: any) {
            failedIds.push(card.id);
            errors.push({ cardId: card.id, message: err.message || "Unknown error" });
          }
        })
      );
      
      onProgress?.(Math.min(i + BATCH_SIZE, cards.length), cards.length, `Processing batch ${Math.ceil((i + 1) / BATCH_SIZE)}...`);
    }
    
    // Update patch record with results
    await supabase
      .from("admin_patches")
      .update({
        status: failedIds.length === cards.length ? "failed" : "completed",
        results: { successIds, failedIds, errors } as unknown as Json,
        before_states: beforeStates as unknown as Json,
      })
      .eq("id", patchId);
    
  } catch (err: any) {
    // Mark as failed
    await supabase
      .from("admin_patches")
      .update({
        status: "failed",
        results: { successIds, failedIds, errors: [...errors, { cardId: "batch", message: err.message }] } as unknown as Json,
        before_states: beforeStates as unknown as Json,
      })
      .eq("id", patchId);
    
    throw err;
  }
  
  return { successIds, failedIds, errors, patchId };
}

/**
 * Rollback a patch to restore cards to their previous state
 */
export async function rollbackPatch(
  patchId: string,
  beforeStates: Record<string, any>
): Promise<void> {
  const cardIds = Object.keys(beforeStates);
  
  for (const cardId of cardIds) {
    const state = beforeStates[cardId];
    await supabase
      .from("cards")
      .update({
        theme: state.theme,
        carousel_settings: state.carousel_settings,
        product_images: state.product_images,
        package_images: state.package_images,
        testimony_images: state.testimony_images,
        social_links: state.social_links,
        design_version: state.design_version,
        last_design_patch_id: null,
      })
      .eq("id", cardId);
  }
  
  // Mark patch as rolled back
  await supabase
    .from("admin_patches")
    .update({ status: "rolled_back" })
    .eq("id", patchId);
}