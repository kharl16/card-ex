interface TilePhotoBackdropProps {
  /** Imported image URL used as the tile texture. */
  src: string;
  /** HSL triplet (e.g. "150 80% 45%") used to tint the texture toward the tile accent. */
  color: string;
}

/**
 * Decorative photographic texture behind a dashboard tile.
 * Purely presentational: hidden from a11y, never intercepts pointer events,
 * and always sits under a dark scrim so tile text keeps its contrast.
 */
export function TilePhotoBackdrop({ src, color }: TilePhotoBackdropProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <img
        src={src}
        alt=""
        width={1024}
        height={640}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover opacity-[0.28] transition-opacity duration-500 group-hover:opacity-40 group-focus-visible:opacity-40"
      />
      {/* Accent tint keeps the photo aligned with the tile colour. */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{ background: `linear-gradient(135deg, hsl(${color} / 0.55), transparent 70%)` }}
      />
      {/* Scrim: darkest where the icon + copy sit, so contrast is unchanged. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}
