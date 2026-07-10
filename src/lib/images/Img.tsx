import React, { memo, useMemo } from "react";
import { getRenderUrl, getRenderSize } from "./ImageService";
import type { ImageKind, RenderVariant } from "./presets";

export interface ImgProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  /** Original Supabase Storage URL (or any absolute URL). */
  url: string | null | undefined;
  /** Image kind — drives which preset transform is used. */
  kind: ImageKind;
  /** default (on-card) vs thumb (admin lists). */
  variant?: RenderVariant;
  /** Above-the-fold hint. */
  eager?: boolean;
  /** `object-fit`; forwarded via style. */
  fit?: "contain" | "cover";
}

/**
 * Memoized <img> that always uses a preset transform URL and includes
 * width/height (to prevent CLS), lazy loading, and async decoding.
 */
export const Img = memo(function Img({
  url,
  kind,
  variant = "default",
  eager = false,
  fit = "contain",
  className,
  style,
  alt = "",
  ...rest
}: ImgProps) {
  const src = useMemo(() => getRenderUrl(url, kind, variant), [url, kind, variant]);
  const size = getRenderSize(kind, variant);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      width={size.width}
      height={size.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      // fetchpriority is a valid HTML attribute; React 18 forwards unknown attrs.
      {...(eager ? { fetchpriority: "high" as unknown as undefined } : {})}
      className={className}
      style={{ objectFit: fit, ...style }}
      {...rest}
    />
  );
});
