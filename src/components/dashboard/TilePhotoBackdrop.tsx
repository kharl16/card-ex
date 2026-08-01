interface TilePhotoBackdropProps {
  /** Imported image URL used as the tile texture. */
  src: string;
  /** HSL triplet (e.g. "150 80% 45%") used to tint the texture toward the tile accent. */
  color: string;
  /** Optional focal point for the background image. Defaults to center. */
  objectPosition?: string;
}

/**
 * Decorative photographic texture behind a dashboard tile.
 * Purely presentational: hidden from a11y, never intercepts pointer events,
 * and always sits under a dark scrim so tile text keeps its contrast.
 */
export function TilePhotoBackdrop({ src, color, objectPosition = "center" }: TilePhotoBackdropProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <img
        src={src}
        alt=""
        width={1024}
        height={640}
        loading="lazy"
        decoding="async"
        style={{ objectPosition }}
        className="h-full w-full object-cover opacity-[0.75] transition-opacity duration-500 group-hover:opacity-90 group-focus-visible:opacity-90"
      />
      {/* Accent tint keeps the photo aligned with the tile colour. */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{ background: `linear-gradient(135deg, hsl(${color} / 0.45), transparent 75%)` }}
      />
      {/* Scrim: only behind the text column, so the imagery stays readable. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/65 via-transparent to-transparent" />
    </div>
  );
}
