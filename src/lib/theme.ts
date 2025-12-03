// Light mode defaults – clean, modern, very legible (good for generic/light cards)
export const LIGHT_MODE_DEFAULTS: ThemeVariant = {
  primary: "#2563EB", // Rich blue for headings / key accents
  background: "#F9FAFB", // Soft off-white
  text: "#0F172A", // Almost-black for strong contrast
  accent: "#F97316", // Warm accent for CTAs / highlights
  buttonColor: "#2563EB", // Solid, trusted blue for buttons
  backgroundType: "gradient",
  gradientStart: "#EEF2FF", // Very subtle blue/lilac tint
  gradientEnd: "#E0F2FE", // Soft sky tint
  gradientDirection: "to-br",
};

// Dark mode defaults – elegant, general-purpose dark card style
export const DARK_MODE_DEFAULTS: ThemeVariant = {
  primary: "#FACC15", // Gold primary
  background: "#020617", // Near-black (slate/ink)
  text: "#F9FAFB", // Off-white text
  accent: "#38BDF8", // Cool cyan accent (links / secondary CTAs)
  buttonColor: "#FACC15", // Gold button stands out on dark
  backgroundType: "gradient",
  gradientStart: "#020617", // Deep navy/ink
  gradientEnd: "#111827", // Slate
  gradientDirection: "to-tr",
};

// Card-Ex MLM Gold default theme
// Variant A = Signature Gold (brand core)
// Variant B = Platinum Gold (subtle premium variation)
export const DEFAULT_THEME: CardTheme = {
  primary: "#FACC15",
  background: "#020617",
  text: "#F9FAFB",
  accent: "#22C55E", // Green accent for “growth / success” CTAs
  buttonColor: "#FACC15",
  backgroundType: "gradient",
  gradientStart: "#020617",
  gradientEnd: "#111827",
  gradientDirection: "to-tr",
  baseMode: "dark",
  mode: "dark",
  activeVariant: "A",
  font: "Inter",
  variants: {
    // A: Signature Gold – your hero Card-Ex look
    A: {
      primary: "#FACC15", // Gold
      background: "#020617", // Deep ink
      text: "#F9FAFB",
      accent: "#22C55E", // Green accent – good for “Join / Sign up”
      buttonColor: "#FACC15",
      backgroundType: "gradient",
      gradientStart: "#020617",
      gradientEnd: "#111827",
      gradientDirection: "to-tr",
      font: "Inter",
      patternType: "none",
      patternOpacity: 0,
      carouselSpeed: 1.0,
    },

    // B: Platinum Gold – a cooler, slightly more “tech” variation
    B: {
      primary: "#E5E7EB", // Soft platinum/silver for headings
      background: "#020617",
      text: "#F9FAFB",
      accent: "#FACC15", // Gold becomes the accent pop
      buttonColor: "#FACC15",
      backgroundType: "gradient",
      gradientStart: "#020617",
      gradientEnd: "#1E293B", // Slightly cooler/navy end
      gradientDirection: "to-br",
      font: "Inter",
      patternType: "diagonal-stripes", // Very subtle gold pattern
      patternColor: "rgba(250, 204, 21, 0.12)",
      patternOpacity: 0.12,
      carouselSpeed: 1.0,
    },
  },
};
