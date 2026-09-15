/**
 * showcase.ts
 *
 * Single source of truth for the five public-card showcase categories.
 *
 * Both presentation modes — the classic Card-Ex carousels and the new
 * immersive (Netflix-inspired) browsing view — consume the exact same
 * category array produced here. Nothing in this module reads or writes
 * storage: it only normalises data that already exists on the card row
 * plus the company-wide "global" image tables.
 *
 * Permanent category order: brochure → videos → products → packages → testimonies
 */

import type { CarouselImage, CarouselKey, CarouselSettingsData } from "@/lib/carouselTypes";
import type { VideoItem } from "@/lib/videoUtils";

export type ShowcaseDisplayMode = "carousel" | "immersive";

export const SHOWCASE_ORDER: CarouselKey[] = [
  "brochure",
  "videos",
  "products",
  "packages",
  "testimonies",
];

export const SHOWCASE_LABELS: Record<CarouselKey, string> = {
  brochure: "Company Brochure",
  videos: "Videos",
  products: "Products",
  packages: "Packages",
  testimonies: "Testimonies",
};

/** A titled group of images inside a category (used by the structured brochure) */
export interface ShowcaseGroup {
  id: string;
  heading: string;
  body?: string | null;
  images: CarouselImage[];
}

export interface ShowcaseCategory {
  key: CarouselKey;
  /** Owner-configured title, falling back to the canonical label */
  title: string;
  /** Images for image categories (empty for videos) */
  images: CarouselImage[];
  /** Videos for the videos category (empty for image categories) */
  videos: VideoItem[];
  /** Total visible items in this category */
  count: number;
  /** True when the owner has this section enabled and it has content */
  isVisible: boolean;
  /** Optional intro text shown above the category (brochure only) */
  intro?: string | null;
  /** Optional titled sub-sections; when present renderers show one row per group */
  groups?: ShowcaseGroup[];
}

export interface GlobalImageLike {
  id?: string;
  url: string;
  url_2?: string | null;
  caption?: string | null;
  srp?: string | null;
  section_id?: string | null;
}

export interface BrochureSectionMeta {
  id: string;
  heading: string;
  body?: string | null;
  /** Explicit page ids for this section (set by an applied brochure template) */
  imageIds?: string[];
}

export interface ShowcaseGlobals {
  brochure?: GlobalImageLike[];
  /** Structured brochure metadata from the shared Global Brochures library */
  brochureTitle?: string | null;
  brochureIntro?: string | null;
  brochureSections?: BrochureSectionMeta[];
  products?: GlobalImageLike[];
  packages?: GlobalImageLike[];
  testimonies?: GlobalImageLike[];
}

/**
 * Normalise one of the card's image JSONB columns into CarouselImage[].
 * Accepts both the current and legacy key spellings.
 */
export function normalizeCarouselImages(raw: unknown): CarouselImage[] {
  if (!raw || !Array.isArray(raw)) return [];

  return (raw as any[])
    .map((img: any, idx: number) => ({
      url: (typeof img?.url === "string" ? img.url : img?.image_url) as string | undefined,
      alt: (img?.alt ?? img?.alt_text ?? img?.title ?? img?.name) as string | undefined,
      order: (img?.order ?? img?.sort_order ?? idx) as number,
      description: (img?.description ?? img?.desc) as string | undefined,
      shareText: (img?.shareText ?? img?.share_text ?? img?.caption) as string | undefined,
      srp: (img?.srp ?? img?.SRP ?? img?.price_srp) as string | undefined,
      hidden: img?.hidden === true,
    }))
    .filter((img) => !!img.url) as CarouselImage[];
}

/** Expand a global image row (which may carry a second URL) into carousel images */
function globalsToCarouselImages(
  globals: GlobalImageLike[] | undefined,
  startOrder: number,
  includeSecondUrl: boolean
): CarouselImage[] {
  if (!globals?.length) return [];
  const expanded = includeSecondUrl
    ? globals.flatMap((g) =>
        [g.url, g.url_2].filter(Boolean).map((u) => ({ ...g, url: u as string }))
      )
    : globals.filter((g) => !!g.url);

  return expanded.map((g, idx) => ({
    url: g.url,
    alt: g.caption ?? undefined,
    order: startOrder + idx,
    description: undefined,
    shareText: g.caption ?? undefined,
    srp: (g as any).srp ?? undefined,
  }));
}

function normalizeVideos(raw: unknown): VideoItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as any[]).filter((v) => v && typeof v.url === "string" && v.url) as VideoItem[];
}

/**
 * Read the card's stored showcase display mode. Anything unrecognised — including
 * cards created before this feature existed — falls back to the classic carousel.
 */
export function getShowcaseDisplayMode(card: any): ShowcaseDisplayMode {
  return card?.showcase_display_mode === "immersive" ? "immersive" : "carousel";
}

/**
 * Build the five showcase categories in their permanent order.
 * Hidden items are filtered out; nothing is mutated or persisted.
 */
export function buildShowcaseCategories(
  card: any,
  settings: CarouselSettingsData,
  globals: ShowcaseGlobals = {}
): ShowcaseCategory[] {
  const ownBrochure = normalizeCarouselImages(card?.brochure_images);
  const sharedBrochure = globals.brochure ?? [];
  const brochureImages = [
    ...ownBrochure,
    ...globalsToCarouselImages(sharedBrochure, ownBrochure.length, true),
  ];

  // Structured brochure: one group per shared brochure section. Pages that are
  // not assigned to a section (and the card's own uploads) stay in a lead group
  // so nothing ever disappears.
  const brochureSections = globals.brochureSections ?? [];
  let brochureGroups: ShowcaseGroup[] | undefined;
  if (brochureSections.length > 0) {
    const groups: ShowcaseGroup[] = [];
    const unsectioned = sharedBrochure.filter(
      (g) => !g.section_id || !brochureSections.some((s) => s.id === g.section_id)
    );
    const leadImages = [
      ...ownBrochure,
      ...globalsToCarouselImages(unsectioned, ownBrochure.length, true),
    ];
    if (leadImages.length > 0) {
      groups.push({
        id: "brochure-lead",
        heading: globals.brochureTitle || SHOWCASE_LABELS.brochure,
        body: null,
        images: leadImages,
      });
    }
    brochureSections.forEach((s) => {
      const images = globalsToCarouselImages(
        sharedBrochure.filter((g) => g.section_id === s.id),
        0,
        true
      );
      if (images.length > 0) {
        groups.push({ id: s.id, heading: s.heading || "", body: s.body ?? null, images });
      }
    });
    if (groups.length > 0) brochureGroups = groups;
  }


  const ownProducts = normalizeCarouselImages(card?.product_images);
  const productImages = [
    ...ownProducts,
    ...globalsToCarouselImages(globals.products, ownProducts.length, true),
  ];

  const ownPackages = normalizeCarouselImages(card?.package_images);
  const packageImages = [
    ...ownPackages,
    ...globalsToCarouselImages(globals.packages, ownPackages.length, true),
  ];

  const ownTestimonies = normalizeCarouselImages(card?.testimony_images);
  const testimonyImages = [
    ...ownTestimonies,
    ...globalsToCarouselImages(globals.testimonies, ownTestimonies.length, false),
  ];

  const videos = normalizeVideos(card?.video_items);

  const byKey: Record<CarouselKey, { images: CarouselImage[]; videos: VideoItem[] }> = {
    brochure: { images: brochureImages, videos: [] },
    videos: { images: [], videos },
    products: { images: productImages, videos: [] },
    packages: { images: packageImages, videos: [] },
    testimonies: { images: testimonyImages, videos: [] },
  };

  return SHOWCASE_ORDER.map((key) => {
    const section = settings[key];
    const visibleImages = byKey[key].images.filter((img) => !img.hidden);
    const visibleVideos = byKey[key].videos.filter((v) => !(v as any).hidden);
    const count = key === "videos" ? visibleVideos.length : visibleImages.length;

    return {
      key,
      title:
        key === "brochure"
          ? section?.title || globals.brochureTitle || SHOWCASE_LABELS[key]
          : section?.title || SHOWCASE_LABELS[key],
      // Pass the unfiltered arrays to the classic renderers — they do their own
      // hidden-item filtering — while `count` reflects what visitors can see.
      images: byKey[key].images,
      videos: byKey[key].videos,
      count,
      isVisible: section?.settings?.enabled !== false && count > 0,
      intro: key === "brochure" ? globals.brochureIntro ?? null : undefined,
      groups: key === "brochure" ? brochureGroups : undefined,
    };
  });
}
