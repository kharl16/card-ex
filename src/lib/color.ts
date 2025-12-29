// Utility helpers to keep CSS variables compatible with shadcn/tailwind tokens.
// shadcn expects tokens like: --primary: 222.2 47.4% 11.2%; (HSL triplet, no `hsl()` wrapper)

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: clamp01(s) * 100, l: clamp01(l) * 100 };
}

function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "").trim();
  const norm =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.length === 6 || raw.length === 8
        ? raw.slice(0, 6)
        : null;

  if (!norm) return null;

  const r = Number.parseInt(norm.slice(0, 2), 16);
  const g = Number.parseInt(norm.slice(2, 4), 16);
  const b = Number.parseInt(norm.slice(4, 6), 16);

  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function parseRgbStringToRgb(input: string): { r: number; g: number; b: number } | null {
  // Supports rgb(255 0 0) and rgb(255, 0, 0)
  const inner = input.trim().replace(/^rgba?\(/i, "").replace(/\)$/, "");
  const parts = inner
    .replace(/\//g, " ")
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  if (parts.length < 3) return null;

  const nums = parts.map((p) => Number.parseFloat(p));
  if (nums.some((n) => Number.isNaN(n))) return null;

  const [r, g, b] = nums;
  return { r, g, b };
}

function parseHslStringToTriplet(input: string): string | null {
  // Supports: hsl(210 40% 98%), hsl(210, 40%, 98%), hsl(210 40% 98% / 1)
  const inner = input
    .trim()
    .replace(/^hsla?\(/i, "")
    .replace(/\)$/, "")
    .trim();

  const noAlpha = inner.split("/")[0].trim();
  const parts = noAlpha
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length < 3) return null;

  const h = Number.parseFloat(parts[0]);
  const s = parts[1];
  const l = parts[2];

  if (Number.isNaN(h)) return null;
  if (!s.includes("%") || !l.includes("%")) return null;

  return `${Math.round(h)} ${s} ${l}`;
}

/**
 * Convert common CSS color strings (hex, rgb(), hsl()) to shadcn's HSL triplet format:
 *   "222.2 47.4% 11.2%"
 */
export function toHslTriplet(color: string): string | null {
  const input = (color || "").trim();
  if (!input) return null;

  // Already looks like a triplet
  if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(input)) {
    return input;
  }

  if (/^hsla?\(/i.test(input)) {
    return parseHslStringToTriplet(input);
  }

  if (input.startsWith("#")) {
    const rgb = parseHexToRgb(input);
    if (!rgb) return null;
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
  }

  if (/^rgba?\(/i.test(input)) {
    const rgb = parseRgbStringToRgb(input);
    if (!rgb) return null;
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
  }

  // Unsupported formats (var(--x), named colors, etc.)
  return null;
}
