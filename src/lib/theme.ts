// Theme types and utilities for A/B theme variants

export interface ThemeVariant {
  primary?: string;
  background?: string;
  text?: string;
  accent?: string;
  buttonColor?: string;
  font?: string;
  backgroundType?: "solid" | "gradient" | "pattern";
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: string;
  patternType?: string;
  patternColor?: string;
  patternOpacity?: number;
  carouselSpeed?: number;
  qr?: any;
}

export interface CardTheme extends ThemeVariant {
  activeVariant?: "A" | "B";
  variants?: {
    A?: ThemeVariant;
    B?: ThemeVariant;
  };
  baseMode?: "light" | "dark";
  mode?: "light" | "dark";
  // Team / Leader preset metadata
  teamPresetName?: string;
  teamLocked?: boolean;
  // Image display modes
  avatarDisplayMode?: "contain" | "cover";
  logoDisplayMode?: "contain" | "cover";
}

// Light mode defaults
export const LIGHT_MODE_DEFAULTS: ThemeVariant = {
  primary: "#2563EB",
  background: "#FFFFFF",
  text: "#111827",
  accent: "#3B82F6",
  buttonColor: "#2563EB",
  backgroundType: "solid",
};

// Dark mode defaults
export const DARK_MODE_DEFAULTS: ThemeVariant = {
  primary: "#D4AF37",
  background: "#050509",
  text: "#F9FAFB",
  accent: "#FACC15",
  buttonColor: "#D4AF37",
  backgroundType: "gradient",
  gradientStart: "#050509",
  gradientEnd: "#1F2937",
  gradientDirection: "to-tr",
};

// Card-Ex MLM Gold default theme
export const DEFAULT_THEME: CardTheme = {
  primary: "#D4AF37",
  background: "#050509",
  text: "#F9FAFB",
  accent: "#FACC15",
  buttonColor: "#D4AF37",
  backgroundType: "gradient",
  gradientStart: "#050509",
  gradientEnd: "#1F2937",
  gradientDirection: "to-tr",
  baseMode: "dark",
  activeVariant: "A",
  variants: {
    A: {
      primary: "#D4AF37",
      background: "#050509",
      text: "#F9FAFB",
      accent: "#FACC15",
      buttonColor: "#D4AF37",
      backgroundType: "gradient",
      gradientStart: "#050509",
      gradientEnd: "#1F2937",
      gradientDirection: "to-tr",
      font: "Inter",
    },
    B: {
      primary: "#D4AF37",
      background: "#050509",
      text: "#F9FAFB",
      accent: "#FACC15",
      buttonColor: "#D4AF37",
      backgroundType: "gradient",
      gradientStart: "#050509",
      gradientEnd: "#1F2937",
      gradientDirection: "to-tr",
      font: "Inter",
    },
  },
};

/**
 * Get the effective/active theme from a card's theme object.
 * Handles backward compatibility for cards without variants.
 */
export const getActiveTheme = (rawTheme: any): CardTheme => {
  const theme = (rawTheme || DEFAULT_THEME) as CardTheme;

  // Backward compatibility: no variants yet - use theme as-is
  if (!theme.variants) {
    return theme;
  }

  const activeKey = theme.activeVariant || "A";
  const variant = theme.variants[activeKey] || {};

  // Merge variant values over top-level as final
  return {
    ...theme,
    ...variant,
  };
};

/**
 * Initialize variants structure from an existing theme.
 * Used when first opening ThemeCustomizer on an old card.
 */
export const initializeVariants = (theme: CardTheme): CardTheme => {
  if (theme.variants && theme.activeVariant) {
    return theme;
  }

  // Merge with DEFAULT_THEME for missing fields
  const base: CardTheme = {
    ...DEFAULT_THEME,
    ...theme,
  };

  // Extract current theme values as Variant A
  const currentVariant: ThemeVariant = {
    primary: base.primary,
    background: base.background,
    text: base.text,
    accent: base.accent,
    buttonColor: base.buttonColor,
    font: base.font,
    backgroundType: base.backgroundType,
    gradientStart: base.gradientStart,
    gradientEnd: base.gradientEnd,
    gradientDirection: base.gradientDirection,
    patternType: base.patternType,
    patternColor: base.patternColor,
    patternOpacity: base.patternOpacity,
    carouselSpeed: base.carouselSpeed,
    qr: base.qr,
  };

  return {
    ...base,
    activeVariant: base.activeVariant || "A",
    variants: {
      A: base.variants?.A || currentVariant,
      B: base.variants?.B || { ...currentVariant },
    },
  };
};

/**
 * Update a specific variant within the theme
 */
export const updateVariant = (
  theme: CardTheme,
  variantKey: "A" | "B",
  updates: Partial<ThemeVariant>
): CardTheme => {
  const variants = theme.variants || { A: {}, B: {} };
  const currentVariant = variants[variantKey] || {};

  const updatedVariant: ThemeVariant = {
    ...currentVariant,
    ...updates,
  };

  const isActive = (theme.activeVariant || "A") === variantKey;

  return {
    ...theme,
    // Keep top-level fields in sync with active variant for backward compatibility
    ...(isActive ? updates : {}),
    activeVariant: theme.activeVariant || "A",
    variants: {
      ...variants,
      [variantKey]: updatedVariant,
    },
  };
};

/**
 * Switch the active variant
 */
export const switchVariant = (theme: CardTheme, variantKey: "A" | "B"): CardTheme => {
  const variants = theme.variants || {};
  const variant = variants[variantKey] || {};

  return {
    ...theme,
    ...variant, // Apply variant values to top-level for backward compatibility
    activeVariant: variantKey,
  };
};
