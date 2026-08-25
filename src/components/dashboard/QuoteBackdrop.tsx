interface QuoteBackdropProps {
  /** Imported image URL used as the decorative texture. */
  src: string;
}

/**
 * Decorative photographic texture behind a quote / scripture slide.
 * Purely presentational: hidden from a11y, never intercepts pointer events,
 * and always sits under a scrim so the text keeps its contrast.
 */
export function QuoteBackdrop({ src }: QuoteBackdropProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <img
        src={src}
        alt=""
        width={1024}
        height={640}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/75 to-background/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/40" />
      <div className="absolute inset-0 mix-blend-overlay opacity-30 bg-gradient-to-br from-primary/40 to-transparent" />
    </div>
  );
}
