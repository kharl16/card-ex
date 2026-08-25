interface QuoteBackdropProps {
  /** Imported image URL used as the decorative texture. */
  src: string;
  /** Where to anchor the image when the container aspect ratio differs. */
  objectPosition?: "center" | "right" | "left" | "top" | "bottom";
}

/**
 * Decorative photographic texture behind a quote / scripture slide.
 * Purely presentational: hidden from a11y, never intercepts pointer events,
 * and always sits under a scrim so the text keeps its contrast.
 */
export function QuoteBackdrop({ src, objectPosition = "center" }: QuoteBackdropProps) {
  const positionClass = {
    center: "object-center",
    right: "object-right",
    left: "object-left",
    top: "object-top",
    bottom: "object-bottom",
  }[objectPosition];

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <img
        src={src}
        alt=""
        width={1280}
        height={800}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover opacity-75 ${positionClass}`}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/60 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/30" />
      <div className="absolute inset-0 mix-blend-overlay opacity-25 bg-gradient-to-br from-primary/40 to-transparent" />
    </div>
  );
}
