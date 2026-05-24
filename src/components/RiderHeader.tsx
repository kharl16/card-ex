import React, { useEffect, useState } from "react";
import { cdnImage } from "@/lib/cdnImage";
import {
  parseImageCarousels,
  resolveSlot,
  type ImageCarouselsData,
} from "@/lib/imageCarousels";

const IMAGE_FIT_NO_CROP = "fill" as const;
const COVER_ASPECT_RATIO = "2.43 / 1";
const COVER_RENDER_WIDTH = 1600;
const COVER_RENDER_HEIGHT = Math.round(COVER_RENDER_WIDTH / 2.43);
const SQUARE_RENDER_SIZE = 320;

/**
 * Crossfade-only rotator for the company logo: opacity transition between
 * images, no zoom/pan, stretched to the exact placeholder box without cropping.
 */
function LogoCrossfade({
  items,
  autoPlayMs = 5000,
  alt,
  width = SQUARE_RENDER_SIZE,
  height = SQUARE_RENDER_SIZE,
  eager = false,
}: {
  items: { url: string; alt?: string }[];
  autoPlayMs?: number;
  alt: string;
  width?: number;
  height?: number;
  eager?: boolean;
}) {
  const safe = items.filter((it) => it && typeof it.url === "string" && it.url);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (safe.length <= 1 || autoPlayMs <= 0) return;
    let id: number | undefined;
    const start = () => {
      if (id !== undefined) return;
      id = window.setInterval(() => setActive((p) => (p + 1) % safe.length), autoPlayMs);
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    if (typeof document === "undefined" || document.visibilityState === "visible") start();
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [safe.length, autoPlayMs]);
  if (safe.length === 0) return null;
  return (
    <div className="relative h-full w-full overflow-hidden p-0">
      {safe.map((item, idx) => (
        <img
          key={`${item.url}-${idx}`}
          src={cdnImage(item.url, {
            width: SQUARE_RENDER_SIZE,
            height: SQUARE_RENDER_SIZE,
            resize: IMAGE_FIT_NO_CROP,
            quality: 80,
          })}
          alt={item.alt || alt}
          decoding="async"
          loading={idx === 0 ? "eager" : "lazy"}
          draggable={false}
          className="absolute inset-0 block h-full w-full max-w-none"
          style={{
            objectFit: IMAGE_FIT_NO_CROP,
            objectPosition: "center",
            width: "100%",
            height: "100%",
            opacity: idx === active ? 1 : 0,
            transition: "opacity 1000ms ease-in-out",
          }}
        />
      ))}
    </div>
  );
}

interface RiderHeaderProps {
  coverUrl?: string | null;
  avatarUrl?: string | null;
  companyLogoUrl?: string | null;
  /** Optional JSONB blob from cards.image_carousels with rotating photo sets per slot. */
  imageCarousels?: unknown;
  name?: string;
  title?: string;
  primaryColor?: string;
  avatarDisplayMode?: "contain" | "cover";
  logoDisplayMode?: "contain" | "cover";
}

// Helper: adjust a hex color lighter/darker
function adjustHexColor(hex: string, amount: number): string {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }

  let normalized = hex;
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    normalized = `#${r}${r}${g}${g}${b}${b}`;
  }

  const r = Math.min(255, Math.max(0, parseInt(normalized.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(normalized.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(normalized.slice(5, 7), 16) + amount));

  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function RiderHeader({
  coverUrl,
  avatarUrl,
  companyLogoUrl,
  imageCarousels,
  name,
  title,
  primaryColor = "#D4AF37",
  avatarDisplayMode = "contain",
  logoDisplayMode = "contain",
}: RiderHeaderProps) {
  const basePrimary = primaryColor;
  const lighterPrimary = adjustHexColor(basePrimary, 50);
  const darkerPrimary = adjustHexColor(basePrimary, -40);

  const carousels: ImageCarouselsData = React.useMemo(
    () => parseImageCarousels(imageCarousels),
    [imageCarousels]
  );
  const cover = resolveSlot(carousels, "cover", coverUrl);
  const avatar = resolveSlot(carousels, "avatar", avatarUrl);
  const logo = resolveSlot(carousels, "logo", companyLogoUrl);

  return (
    <div className="relative mt-0 mb-4 w-full max-w-full overflow-x-clip overflow-y-visible z-30">
      {/* Cover image: exact frame, no carousel/zoom */}
      <div
        className="relative block w-full max-w-full overflow-visible p-0"
        style={{
          aspectRatio: COVER_ASPECT_RATIO,
          height: "auto",
          minHeight: 0,
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden p-0"
          style={{
            backgroundImage:
              cover.items.length === 0 && primaryColor
                ? `linear-gradient(to bottom right, ${primaryColor}33, ${primaryColor}0D)`
                : undefined,
            backgroundColor:
              cover.items.length === 0 && !primaryColor ? "hsl(var(--primary) / 0.2)" : undefined,
          }}
        >
          {cover.items.length > 0 && (
            <img
              src={cdnImage(cover.items[0].url, {
                width: COVER_RENDER_WIDTH,
                height: COVER_RENDER_HEIGHT,
                resize: IMAGE_FIT_NO_CROP,
                quality: 80,
              })}
              alt={cover.items[0].alt || `${name || "Profile"} cover photo`}
              decoding="async"
              loading="eager"
              draggable={false}
              className="absolute inset-0 block h-full w-full max-w-none"
              style={{
                objectFit: IMAGE_FIT_NO_CROP,
                objectPosition: "center",
                width: "100%",
                height: "100%",
              }}
            />
          )}

          {/* Luxury gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Gold accent line under cover */}
        <div
          className="absolute inset-x-0 bottom-0 h-[3px] animate-gold-pulse"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${basePrimary}80 30%, ${lighterPrimary} 50%, ${basePrimary}80 70%, transparent 100%)`,
            boxShadow: `0 0 8px ${basePrimary}60, 0 0 20px ${basePrimary}30`,
          }}
        />

        {/* Avatar & Logo row */}
        <div className="absolute left-0 right-0 bottom-0 translate-y-1/2 flex items-end justify-between px-8 sm:px-10 z-[9999] pointer-events-none">
        {/* Avatar with animated rotating ring */}
        <div className="relative size-24 sm:size-28 shrink-0 rounded-full shadow-luxury transition-all duration-500 hover:scale-105 group/avatar pointer-events-auto">
          {/* Rotating conic-gradient ring */}
          <div
            className="absolute inset-0 rounded-full animate-ring-rotate"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, ${lighterPrimary} 0deg, ${basePrimary} 90deg, ${darkerPrimary} 180deg, ${basePrimary} 270deg, ${lighterPrimary} 360deg)`,
            }}
          />

          {/* Outer glow on hover */}
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
            style={{
              background: `radial-gradient(circle, ${basePrimary}60 0%, transparent 70%)`,
              transform: "scale(1.6)",
            }}
          />

          {/* Inner black circle + avatar */}
          <div className="absolute inset-[3px] rounded-full bg-black p-0 overflow-hidden">
            <div className="absolute inset-0 rounded-full overflow-hidden bg-black p-0">
              {avatar.items.length > 0 && (
                <img
                  src={cdnImage(avatar.items[0].url, {
                    width: SQUARE_RENDER_SIZE,
                    height: SQUARE_RENDER_SIZE,
                    resize: IMAGE_FIT_NO_CROP,
                    quality: 80,
                  })}
                  alt={avatar.items[0].alt || name || "Profile"}
                  decoding="async"
                  loading="eager"
                  draggable={false}
                  className="block h-full w-full max-w-none"
                  style={{
                    objectFit: IMAGE_FIT_NO_CROP,
                    objectPosition: "center",
                    width: "100%",
                    height: "100%",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Company logo – glassmorphic square */}
        {logo.items.length > 0 && (
          <div
            className="size-24 sm:size-28 shrink-0 rounded-2xl overflow-hidden shadow-luxury p-0 hover:scale-105 transition-all duration-500 pointer-events-auto glass-shimmer"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(var(--glass-blur))",
              WebkitBackdropFilter: "blur(var(--glass-blur))",
              border: "1px solid var(--glass-border)",
              borderTop: "1px solid var(--glass-border-highlight)",
              boxShadow: "var(--glass-inner-glow), var(--glass-shadow)",
            }}
          >
            <LogoCrossfade
              items={logo.items}
              autoPlayMs={logo.autoPlayMs}
              alt={`${name || "Card"} company logo`}
            />
          </div>
        )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-20 sm:h-24" />

      {/* Name/title */}
      {(name || title) && (
        <div className="pl-8 sm:pl-10 pr-6 pt-2 pb-2">
          <div className="flex flex-col space-y-0.5 leading-relaxed">
            {name && (
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${lighterPrimary}, #ffffff)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {name}
              </h1>
            )}
            {title && (
              <p
                className="text-sm sm:text-base text-muted-foreground font-light tracking-wide uppercase"
                style={{ letterSpacing: "0.08em" }}
              >
                {title}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
