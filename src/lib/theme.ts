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
}

// Default theme values
export const DEFAULT_THEME: ThemeVariant = {
  primary: "#D4AF37",
  background: "#0B0B0C",
  text: "#F8F8F8",
  accent: "#E6C85C",
  buttonColor: "#D4AF37",
  backgroundType: "solid",
};

export const LIGHT_MODE_DEFAULTS = {
  background: "#F8F8F8",
  text: "#111111",
};

export const DARK_MODE_DEFAULTS = {
  background: "#0B0B0C",
  text: "#F8F8F8",
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
  if (theme.variants) {
    return theme; // Already has variants
  }

  // Extract current theme values as Variant A
  const currentVariant: ThemeVariant = {
    primary: theme.primary,
    background: theme.background,
    text: theme.text,
    accent: theme.accent,
    buttonColor: theme.buttonColor,
    font: theme.font,
    backgroundType: theme.backgroundType,
    gradientStart: theme.gradientStart,
    gradientEnd: theme.gradientEnd,
    gradientDirection: theme.gradientDirection,
    patternType: theme.patternType,
    patternColor: theme.patternColor,
    patternOpacity: theme.patternOpacity,
    carouselSpeed: theme.carouselSpeed,
    qr: theme.qr,
  };

  // Create a light variant as B (or alternate)
  const alternateVariant: ThemeVariant = {
    ...currentVariant,
    background: LIGHT_MODE_DEFAULTS.background,
    text: LIGHT_MODE_DEFAULTS.text,
  };

  return {
    ...theme,
    activeVariant: "A",
    baseMode: theme.mode || "dark",
    variants: {
      A: currentVariant,
      B: alternateVariant,
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
  const variants = theme.variants || {};
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
