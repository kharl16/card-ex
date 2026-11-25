export const AMBIENT_THEME_IDS = [
  "classic",
  "obsidian",
  "hyperdrive",
  "cosmic",
  "emerald",
  "titanium",
] as const;

export type AmbientThemeId = (typeof AMBIENT_THEME_IDS)[number];

export interface AmbientThemeDefinition {
  id: AmbientThemeId;
  name: string;
  shortName: string;
  description: string;
}

export const AMBIENT_THEMES: readonly AmbientThemeDefinition[] = [
  {
    id: "classic",
    name: "Classic Minimal",
    shortName: "Classic",
    description: "Clean, still luxury with no background motion.",
  },
  {
    id: "obsidian",
    name: "Executive Obsidian",
    shortName: "Obsidian",
    description: "Signature black, champagne light and floating gold rings.",
  },
  {
    id: "hyperdrive",
    name: "Hyper-Drive Cyber",
    shortName: "Cyber",
    description: "A deep perspective grid with a luminous tech horizon.",
  },
  {
    id: "cosmic",
    name: "Cosmic Royal",
    shortName: "Cosmic",
    description: "Velvet nebula clouds with drifting golden starlight.",
  },
  {
    id: "emerald",
    name: "Emerald Sovereign",
    shortName: "Emerald",
    description: "Deep green velvet, aura pools and heritage rings.",
  },
  {
    id: "titanium",
    name: "Titanium Carbon",
    shortName: "Titanium",
    description: "Precision carbon weave with sliding metallic light.",
  },
];

interface CardThemeCarrier {
  theme?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
}

export function isAmbientThemeId(value: unknown): value is AmbientThemeId {
  return typeof value === "string" && AMBIENT_THEME_IDS.includes(value as AmbientThemeId);
}

export function normalizeAmbientTheme(value: unknown): AmbientThemeId {
  return isAmbientThemeId(value) ? value : "classic";
}

/** Missing and older themes deliberately remain unchanged: Classic Minimal. */
export function getCardAmbientTheme(theme: unknown): AmbientThemeId {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return "classic";
  return normalizeAmbientTheme((theme as Record<string, unknown>).ambientTheme);
}

export function isDashboardThemeSynced(theme: unknown): boolean {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return false;
  return (theme as Record<string, unknown>).dashboardThemeSync === true;
}

export function withAmbientTheme<T extends object>(
  theme: T | null | undefined,
  ambientTheme: AmbientThemeId,
  dashboardThemeSync?: boolean,
): T & { ambientTheme: AmbientThemeId; dashboardThemeSync?: boolean } {
  return {
    ...(theme || {}),
    ambientTheme,
    ...(dashboardThemeSync === undefined ? {} : { dashboardThemeSync }),
  } as T & { ambientTheme: AmbientThemeId; dashboardThemeSync?: boolean };
}

/** The most recently edited synced card wins, which makes switching cards predictable. */
export function resolveDashboardAmbientTheme(cards: readonly CardThemeCarrier[]): AmbientThemeId {
  const latestSynced = cards
    .filter((card) => isDashboardThemeSynced(card.theme))
    .sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];

  return latestSynced ? getCardAmbientTheme(latestSynced.theme) : "classic";
}

/** Bounded movement keeps the decorative planes covering even very long pages. */
export function getAmbientParallaxOffsets(scrollY: number) {
  const progress = Math.min(Math.max(Number.isFinite(scrollY) ? scrollY : 0, 0), 2400);
  return {
    far: -(progress * 0.025),
    middle: -(progress * 0.06),
    near: -(progress * 0.1),
  };
}
