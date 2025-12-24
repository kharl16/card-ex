/**
 * Card Snapshot - Single source of truth for card data serialization
 * 
 * Used for:
 * - Save as Template
 * - Apply Template to New Card
 * - Duplicate Card to Another User
 * 
 * This ensures complete fidelity between Editor → Preview → Actual Card
 */

import type { CardProductImage } from "@/lib/theme";
import type { CarouselSettingsData } from "@/lib/carouselTypes";

export interface CardLink {
  kind: string;
  label: string;
  value: string;
  icon?: string | null;
  sort_index?: number | null;
}

export interface SocialLink {
  kind: string;
  label: string;
  url?: string;
  value?: string;
}

export interface CarouselImage {
  url: string;
  alt?: string;
  order?: number;
}

/**
 * Complete Card Snapshot - contains everything needed to recreate a card
 */
export interface CardSnapshot {
  // Theme (includes colors, fonts, gradients, patterns, QR settings, display modes)
  theme: Record<string, any>;
  
  // Carousel master switch
  carousel_enabled: boolean;
  
  // Design assets (image URLs)
  cover_url: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  
  // Identity fields
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  prefix: string | null;
  suffix: string | null;
  
  // Professional info
  title: string | null;
  company: string | null;
  bio: string | null;
  
  // Contact info
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  
  // Social links (JSONB on cards table)
  social_links: SocialLink[] | null;
  
  // Card links (from card_links table - social media, additional contacts)
  card_links: CardLink[];
  
  // Carousel settings (full object with all 3 sections)
  carousel_settings: Partial<CarouselSettingsData> | null;
  
  // Carousel images (stored in JSONB columns on cards table)
  product_images: CardProductImage[];
  package_images: CarouselImage[];
  testimony_images: CarouselImage[];
  
  // Source reference
  source_card_id: string | null;
}

/**
 * Build a complete snapshot from a card object.
 * All data comes from the card row JSON columns (product_images, package_images, testimony_images).
 * 
 * @param card - The card row from database
 * @param cardLinks - Optional card_links fetched from the card_links table
 */
export function buildCardSnapshot(
  card: Record<string, any>,
  cardLinks?: CardLink[]
): CardSnapshot {
  // Deep copy theme to avoid mutations, remove QR data/URL (new cards generate their own)
  const theme = card.theme ? JSON.parse(JSON.stringify(card.theme)) : {};
  if (theme.qrSettings) {
    delete theme.qrSettings.data;
    delete theme.qrSettings.url;
  }
  
  // Extract product images from cards.product_images JSONB (supports both {image_url} and {url} shapes)
  const productImages: CardProductImage[] = [];
  const rawProductImages = card.product_images;
  if (rawProductImages && Array.isArray(rawProductImages)) {
    rawProductImages.forEach((img: any, idx: number) => {
      const imageUrl =
        (typeof img?.image_url === "string" && img.image_url) || (typeof img?.url === "string" && img.url) || null;
      if (!imageUrl) return;

      productImages.push({
        image_url: imageUrl,
        alt_text: (img?.alt_text ?? img?.alt ?? null) as string | null,
        description: (img?.description ?? null) as string | null,
        sort_order: (img?.sort_order ?? img?.order ?? idx) as number,
      });
    });
  }
  
  // Extract package images from JSONB
  const packageImages: CarouselImage[] = [];
  const rawPackageImages = card.package_images;
  if (rawPackageImages && Array.isArray(rawPackageImages)) {
    rawPackageImages.forEach((img: any, idx: number) => {
      packageImages.push({
        url: img.url,
        alt: img.alt || undefined,
        order: img.order ?? idx,
      });
    });
  }
  
  // Extract testimony images from JSONB
  const testimonyImages: CarouselImage[] = [];
  const rawTestimonyImages = card.testimony_images;
  if (rawTestimonyImages && Array.isArray(rawTestimonyImages)) {
    rawTestimonyImages.forEach((img: any, idx: number) => {
      testimonyImages.push({
        url: img.url,
        alt: img.alt || undefined,
        order: img.order ?? idx,
      });
    });
  }
  
  // Extract social links from JSONB
  let socialLinks: SocialLink[] | null = null;
  if (card.social_links) {
    if (Array.isArray(card.social_links)) {
      socialLinks = card.social_links;
    } else {
      try {
        socialLinks = JSON.parse(card.social_links);
      } catch {
        socialLinks = null;
      }
    }
  }
  
  // Format card links
  const formattedCardLinks: CardLink[] = (cardLinks || []).map((link, idx) => ({
    kind: link.kind,
    label: link.label,
    value: link.value,
    icon: link.icon || null,
    sort_index: link.sort_index ?? idx,
  }));
  
  return {
    theme,
    carousel_enabled: card.carousel_enabled ?? true,
    
    // Design assets
    cover_url: card.cover_url || null,
    logo_url: card.logo_url || null,
    avatar_url: card.avatar_url || null,
    
    // Identity
    full_name: card.full_name || null,
    first_name: card.first_name || null,
    middle_name: card.middle_name || null,
    last_name: card.last_name || null,
    prefix: card.prefix || null,
    suffix: card.suffix || null,
    
    // Professional
    title: card.title || null,
    company: card.company || null,
    bio: card.bio || null,
    
    // Contact
    email: card.email || null,
    phone: card.phone || null,
    website: card.website || null,
    location: card.location || null,
    
    // Links
    social_links: socialLinks,
    card_links: formattedCardLinks,
    
    // Carousel settings (full object)
    carousel_settings: card.carousel_settings || null,
    
    // Carousel images
    product_images: productImages,
    package_images: packageImages,
    testimony_images: testimonyImages,
    
    // Source reference
    source_card_id: card.id || null,
  };
}

/**
 * Build insert data for a new card from a snapshot
 * 
 * @param snapshot - The card snapshot
 * @param userId - The user_id for the new card
 * @param slug - The unique slug for the new card
 * @param overrides - Optional field overrides (e.g., custom full_name)
 */
export function buildCardInsertFromSnapshot(
  snapshot: CardSnapshot,
  userId: string,
  slug: string,
  overrides?: Partial<{
    full_name: string;
    owner_name: string;
    is_published: boolean;
  }>
): Record<string, any> {
  return {
    user_id: userId,
    slug,
    is_published: overrides?.is_published ?? false,
    custom_slug: null, // New cards start without custom slug
    views_count: 0,
    unique_views: 0,
    
    // Theme
    theme: snapshot.theme,
    carousel_enabled: snapshot.carousel_enabled,
    
    // Design assets
    cover_url: snapshot.cover_url,
    logo_url: snapshot.logo_url,
    avatar_url: snapshot.avatar_url,
    
    // Identity - use override or snapshot
    full_name: overrides?.full_name || snapshot.full_name || "New Card",
    first_name: snapshot.first_name,
    middle_name: snapshot.middle_name,
    last_name: snapshot.last_name,
    prefix: snapshot.prefix,
    suffix: snapshot.suffix,
    owner_name: overrides?.owner_name || snapshot.full_name,
    
    // Professional
    title: snapshot.title,
    company: snapshot.company,
    bio: snapshot.bio,
    
    // Contact
    email: snapshot.email,
    phone: snapshot.phone,
    website: snapshot.website,
    location: snapshot.location,
    
    // Social links (JSONB)
    social_links: snapshot.social_links,
    
    // Carousel settings (JSONB - complete object)
    carousel_settings: snapshot.carousel_settings,
    
    // Carousel images (JSONB)
    product_images: snapshot.product_images,
    package_images: snapshot.package_images,
    testimony_images: snapshot.testimony_images,
    
    // Card type
    card_type: 'publishable',
  };
}

/**
 * Build card_links insert data from a snapshot
 * 
 * @param snapshot - The card snapshot
 * @param newCardId - The ID of the newly created card
 */
export function buildCardLinksInsertFromSnapshot(
  snapshot: CardSnapshot,
  newCardId: string
): Array<{
  card_id: string;
  kind: "phone" | "sms" | "email" | "url" | "whatsapp" | "messenger" | "telegram" | "viber" | "facebook" | "instagram" | "tiktok" | "x" | "youtube" | "linkedin" | "custom";
  label: string;
  value: string;
  icon: string | null;
  sort_index: number;
}> {
  return snapshot.card_links.map((link, index) => ({
    card_id: newCardId,
    kind: link.kind as "phone" | "sms" | "email" | "url" | "whatsapp" | "messenger" | "telegram" | "viber" | "facebook" | "instagram" | "tiktok" | "x" | "youtube" | "linkedin" | "custom",
    label: link.label,
    value: link.value,
    icon: link.icon || null,
    sort_index: link.sort_index ?? index,
  }));
}
