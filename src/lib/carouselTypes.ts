// Carousel types for the three independent carousel sections
// All stored in cards.carousel_settings JSON column

export type CarouselKey = "products" | "packages" | "testimonies";

export type CarouselBackgroundType = "solid" | "gradient" | "transparent";
export type CarouselGradientDirection = "to-r" | "to-l" | "to-b" | "to-t" | "to-tr" | "to-br" | "to-tl" | "to-bl";

export interface CarouselBackground {
  enabled: boolean;
  type: CarouselBackgroundType;
  gradient?: {
    from: string;
    to: string;
    direction: CarouselGradientDirection;
  };
  solid_color?: string;
  innerPadding?: number; // pixels (0-32), default 8
  borderWidth?: number;  // pixels (0-8), default 0
  borderColor?: string;  // hex color for border
}

export type CTAAction = "link" | "scroll" | "contact" | "modal";
export type CTAPlacement = "below" | "overlay_bottom" | "header_right";
export type CTAVariant = "solid" | "outline" | "ghost";
export type CTAShape = "pill" | "rounded" | "square";
export type CTASize = "sm" | "md" | "lg";
export type CTAWidth = "fit" | "full";
export type CTAScrollTarget = "top" | "contact" | "carousel_products" | "carousel_packages" | "carousel_testimonies";
export type CTAContactMethod = "messenger" | "whatsapp" | "viber" | "sms" | "email" | "phone";

export interface CTAStyle {
  variant: CTAVariant;
  shape: CTAShape;
  size: CTASize;
  width: CTAWidth;
  background?: string;
  text?: string;
  border?: string;
  glow?: boolean;
}

export interface CarouselCTA {
  enabled: boolean;
  label: string;
  action: CTAAction;
  href?: string;
  target?: "_blank" | "_self";
  scroll_target?: CTAScrollTarget;
  contact_method?: CTAContactMethod;
  modal_content?: string;
  placement: CTAPlacement;
  style: CTAStyle;
}

export type ImageSize = "sm" | "md" | "lg";

export interface CarouselSettings {
  enabled: boolean;
  autoPlayMs: number;
  direction: "ltr" | "rtl";
  maxImages: number;
  imageSize?: ImageSize;
  imageGap?: number; // pixels (0-32), default 12
}

export interface CarouselImage {
  url: string;
  alt?: string;
  order?: number;
}

export interface CarouselSection {
  title: string;
  images: CarouselImage[];
  background: CarouselBackground;
  settings: CarouselSettings;
  cta: CarouselCTA;
}

export interface CarouselSettingsData {
  products: CarouselSection;
  packages: CarouselSection;
  testimonies: CarouselSection;
}

// Default CTA styles per carousel type
export const DEFAULT_CTA_STYLES: Record<CarouselKey, CTAStyle> = {
  products: {
    variant: "solid",
    shape: "pill",
    size: "md",
    width: "fit",
    glow: true,
  },
  packages: {
    variant: "outline",
    shape: "rounded",
    size: "md",
    width: "fit",
    glow: false,
  },
  testimonies: {
    variant: "solid",
    shape: "pill",
    size: "md",
    width: "fit",
    glow: true,
  },
};

// Default CTA labels per carousel type
export const DEFAULT_CTA_LABELS: Record<CarouselKey, string> = {
  products: "Inquire Now",
  packages: "View Packages",
  testimonies: "Message Us",
};

// Default carousel section factory
export function createDefaultCarouselSection(key: CarouselKey): CarouselSection {
  const maxImages = key === "testimonies" ? 200 : 50;
  const direction = key === "packages" ? "rtl" : "ltr";
  const title = key.charAt(0).toUpperCase() + key.slice(1);

  return {
    title,
    images: [],
    background: {
      enabled: false,
      type: "transparent",
    },
    settings: {
      enabled: true,
      autoPlayMs: 4000,
      direction,
      maxImages,
      imageSize: "md" as ImageSize,
    },
    cta: {
      enabled: false,
      label: DEFAULT_CTA_LABELS[key],
      action: "contact",
      contact_method: "messenger",
      placement: "below",
      style: DEFAULT_CTA_STYLES[key],
    },
  };
}

// Create default carousel settings with all three sections
export function createDefaultCarouselSettings(): CarouselSettingsData {
  return {
    products: createDefaultCarouselSection("products"),
    packages: createDefaultCarouselSection("packages"),
    testimonies: createDefaultCarouselSection("testimonies"),
  };
}

// Merge existing partial settings with defaults
export function mergeCarouselSettings(
  existing: Partial<CarouselSettingsData> | null | undefined
): CarouselSettingsData {
  const defaults = createDefaultCarouselSettings();
  
  if (!existing) return defaults;

  return {
    products: mergeSection(defaults.products, existing.products),
    packages: mergeSection(defaults.packages, existing.packages),
    testimonies: mergeSection(defaults.testimonies, existing.testimonies),
  };
}

function mergeSection(
  defaultSection: CarouselSection,
  existing: Partial<CarouselSection> | undefined
): CarouselSection {
  if (!existing) return defaultSection;

  return {
    title: existing.title ?? defaultSection.title,
    images: existing.images ?? defaultSection.images,
    background: {
      ...defaultSection.background,
      ...existing.background,
    },
    settings: {
      ...defaultSection.settings,
      ...existing.settings,
    },
    cta: {
      ...defaultSection.cta,
      ...existing.cta,
      style: {
        ...defaultSection.cta.style,
        ...existing.cta?.style,
      },
    },
  };
}

// Get CSS for carousel background
export function getCarouselBackgroundCSS(background: CarouselBackground): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  // Add border if configured
  if (background.borderWidth && background.borderWidth > 0) {
    styles.borderWidth = `${background.borderWidth}px`;
    styles.borderStyle = "solid";
    styles.borderColor = background.borderColor || "hsl(var(--border))";
  }
  
  // Add inner padding if configured
  if (background.innerPadding && background.innerPadding > 0) {
    styles.padding = `${background.innerPadding}px`;
  }

  if (!background.enabled || background.type === "transparent") {
    return styles;
  }

  if (background.type === "solid" && background.solid_color) {
    return { ...styles, backgroundColor: background.solid_color };
  }

  if (background.type === "gradient" && background.gradient) {
    const { from, to, direction } = background.gradient;
    const directionMap: Record<CarouselGradientDirection, string> = {
      "to-r": "to right",
      "to-l": "to left",
      "to-b": "to bottom",
      "to-t": "to top",
      "to-tr": "to top right",
      "to-br": "to bottom right",
      "to-tl": "to top left",
      "to-bl": "to bottom left",
    };
    return {
      ...styles,
      background: `linear-gradient(${directionMap[direction]}, ${from}, ${to})`,
    };
  }

  return styles;
}

// Get Tailwind classes for CTA button
export function getCTAButtonClasses(style: CTAStyle): string {
  const classes: string[] = [];

  // Shape
  switch (style.shape) {
    case "pill":
      classes.push("rounded-full");
      break;
    case "rounded":
      classes.push("rounded-lg");
      break;
    case "square":
      classes.push("rounded-none");
      break;
  }

  // Size
  switch (style.size) {
    case "sm":
      classes.push("px-3 py-1.5 text-sm");
      break;
    case "md":
      classes.push("px-4 py-2 text-base");
      break;
    case "lg":
      classes.push("px-6 py-3 text-lg");
      break;
  }

  // Width
  if (style.width === "full") {
    classes.push("w-full");
  }

  // Glow effect
  if (style.glow) {
    classes.push("shadow-lg shadow-primary/25");
  }

  return classes.join(" ");
}
