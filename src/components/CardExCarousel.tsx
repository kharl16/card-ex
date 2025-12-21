import React, { useEffect, useState, useMemo } from "react";
import { useRouletteCarousel } from "@/hooks/useRouletteCarousel";
import { useLightbox, type LightboxImage } from "@/hooks/useLightbox";
import LightboxDialog from "@/components/LightboxDialog";
import SpotlightStage, { getSlideActiveClass } from "@/components/SpotlightStage";
import Carousel3DRing from "@/components/Carousel3DRing";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Types
export type CardExCarouselMode = "roulette" | "ring3d" | "flat";

export interface CardExCarouselItem {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  description?: string;
  href?: string;
  badge?: string;
}

export type CardExCarouselEventType =
  | "slide_view"
  | "image_click"
  | "lightbox_open"
  | "lightbox_close"
  | "download";

export interface CardExCarouselEvent {
  type: CardExCarouselEventType;
  index: number;
  item?: CardExCarouselItem;
}

export type CarouselDepth = "soft" | "medium" | "strong";

export type CarouselDirection = "rtl" | "ltr";

export interface CardExCarouselProps {
  items: CardExCarouselItem[];
  mode?: CardExCarouselMode;
  autoPlayMs?: number | null;
  showLightbox?: boolean;
  visibleSlides?: number;
  className?: string;
  onEvent?: (event: CardExCarouselEvent) => void;
  depth?: CarouselDepth;
  spotlightEnabled?: boolean;
  /** Direction of carousel scroll: "rtl" (right-to-left) or "ltr" (left-to-right) */
  direction?: CarouselDirection;
  /** Image size: "sm" | "md" | "lg" */
  imageSize?: "sm" | "md" | "lg";
}

// Check for reduced motion preference
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Depth configuration for 3D effects
// Depth configuration - scales are reduced to prevent overlap
const depthConfig: Record<CarouselDepth, { scale: number; translateZ: number; rotateY: number }> = {
  soft: { scale: 1.05, translateZ: 30, rotateY: 8 },
  medium: { scale: 1.1, translateZ: 40, rotateY: 10 },
  strong: { scale: 1.15, translateZ: 50, rotateY: 12 },
};

// ============== ROULETTE MODE ==============
interface RouletteModeProps {
  items: CardExCarouselItem[];
  autoPlayMs: number | null;
  visibleSlides: number;
  showLightbox: boolean;
  onEvent?: (event: CardExCarouselEvent) => void;
  depth: CarouselDepth;
  spotlightEnabled: boolean;
  direction: CarouselDirection;
  imageSize: "sm" | "md" | "lg";
}

// Image size configurations
const imageSizeConfig = {
  sm: { height: "h-[140px] sm:h-[160px]" },
  md: { height: "h-[200px] sm:h-[220px]" },
  lg: { height: "h-[260px] sm:h-[300px]" },
};

function RouletteMode({
  items,
  autoPlayMs,
  visibleSlides,
  showLightbox,
  onEvent,
  depth,
  spotlightEnabled,
  direction,
  imageSize,
}: RouletteModeProps) {
  const reducedMotion = prefersReducedMotion();
  const count = items.length;
  const loopImages = [...items, ...items]; // Duplicate for seamless looping

  const {
    position,
    setPosition,
    logicalCenter,
    translatePercent,
    slideWidthPercent,
    bindTouchHandlers,
    cyclicDistance,
    next,
    prev,
  } = useRouletteCarousel({
    count,
    autoPlayMs: reducedMotion ? null : autoPlayMs,
    visibleSlides,
    prefersReducedMotion: reducedMotion,
    direction,
  });

  const sizeClasses = imageSizeConfig[imageSize] || imageSizeConfig.md;

  const lightboxImages: LightboxImage[] = useMemo(
    () => items.map((item) => ({ url: item.url, alt: item.alt })),
    [items]
  );

  const lightbox = useLightbox({
    images: lightboxImages,
    enabled: showLightbox,
    onOpen: (index) => onEvent?.({ type: "lightbox_open", index, item: items[index] }),
    onClose: (index) => onEvent?.({ type: "lightbox_close", index, item: items[index] }),
    onDownload: (index) => onEvent?.({ type: "download", index, item: items[index] }),
  });

  const handleImageClick = (logicalIndex: number) => {
    if (showLightbox) {
      lightbox.openLightbox(logicalIndex);
    } else {
      onEvent?.({ type: "image_click", index: logicalIndex, item: items[logicalIndex] });
    }
  };

  const depthSettings = depthConfig[depth];

  const computeDepthStyles = (logicalIndex: number) => {
    const dist = cyclicDistance(logicalIndex, Math.round(logicalCenter));
    const maxDepth = 2;
    const clamped = Math.min(dist, maxDepth);

    const scale = depthSettings.scale - clamped * 0.22;
    const translateZ = (maxDepth - clamped) * depthSettings.translateZ;
    const rotateDirection = logicalIndex < Math.round(logicalCenter) ? -1 : 1;
    const rotateY = clamped === 0 ? 0 : rotateDirection * (depthSettings.rotateY + clamped * 4);
    const opacity = 1 - clamped * 0.2;

    return { scale, translateZ, rotateY, opacity };
  };

  return (
    <SpotlightStage
      activeIndex={Math.round(logicalCenter)}
      count={count}
      enabled={spotlightEnabled}
    >
      <div
        className="relative w-full mx-auto"
        role="region"
        aria-roledescription="carousel"
        aria-label="Product image carousel"
      >
        <div className="flex w-full justify-center">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-background to-muted shadow-xl",
              sizeClasses.height
            )}
            style={{ perspective: "1200px" }}
            {...bindTouchHandlers}
          >
            <div
              className="flex h-full"
              style={{ transform: `translateX(${translatePercent}%)` }}
            >
              {loopImages.map((img, i) => {
                const logicalIndex = i % count;
                const { scale, translateZ, rotateY, opacity } = computeDepthStyles(logicalIndex);
                const isActive = cyclicDistance(logicalIndex, Math.round(logicalCenter)) === 0;
                const slideClass = getSlideActiveClass(logicalIndex, Math.round(logicalCenter), count, spotlightEnabled);

                  // Clamp scale to prevent overlap - max 1.15 for center item
                  const clampedScale = Math.min(scale, 1.15);

                  return (
                    <div
                      key={`${img.id}-${i}`}
                      className={cn(
                        "relative h-full flex-shrink-0 transform-gpu px-3 sm:px-4",
                        slideClass
                      )}
                      style={{
                        width: `${slideWidthPercent}%`,
                        transformStyle: "preserve-3d",
                        transform: `translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${clampedScale})`,
                        opacity,
                        transition: reducedMotion ? "none" : "transform 220ms linear, opacity 220ms linear, filter 250ms ease",
                      }}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`Slide ${logicalIndex + 1} of ${count}`}
                    >
                    <button
                      type="button"
                      className="h-full w-full overflow-hidden rounded-2xl bg-transparent flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                      onClick={() => handleImageClick(logicalIndex)}
                      aria-label={img.alt || `View image ${logicalIndex + 1}`}
                    >
                      <img
                        src={img.url}
                        alt={img.alt ?? ""}
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                      {img.badge && (
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                          {img.badge}
                        </Badge>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Navigation arrows */}
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white text-sm shadow-lg ring-1 ring-primary/40 backdrop-blur hover:bg-black/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Previous slide"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white text-sm shadow-lg ring-1 ring-primary/40 backdrop-blur hover:bg-black/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Next slide"
            >
              ›
            </button>
          </div>
        </div>

        <LightboxDialog
          open={lightbox.lightboxOpen}
          onOpenChange={lightbox.setLightboxOpen}
          currentImage={lightbox.currentImage}
          index={lightbox.lightboxIndex}
          count={lightbox.count}
          zoomLevel={lightbox.zoomLevel}
          onZoomIn={lightbox.zoomIn}
          onZoomOut={lightbox.zoomOut}
          onResetZoom={lightbox.resetZoom}
          onNext={lightbox.nextImage}
          onPrev={lightbox.prevImage}
          onDownload={lightbox.handleDownload}
          onClose={lightbox.closeLightbox}
        />
      </div>
    </SpotlightStage>
  );
}

// ============== RING 3D MODE ==============
interface Ring3DModeProps {
  items: CardExCarouselItem[];
  autoPlayMs: number | null;
  onEvent?: (event: CardExCarouselEvent) => void;
  depth: CarouselDepth;
  spotlightEnabled: boolean;
  showLightbox: boolean;
}

function Ring3DMode({
  items,
  autoPlayMs,
  onEvent,
  depth,
  spotlightEnabled,
  showLightbox,
}: Ring3DModeProps) {
  const reducedMotion = prefersReducedMotion();
  const imageUrls = items.map((item) => item.url);

  // Map depth to ring3d speedDeg
  const speedDegMap: Record<CarouselDepth, number> = {
    soft: 0.15,
    medium: 0.22,
    strong: 0.30,
  };

  // Convert autoPlayMs to speedDeg (lower ms = faster speed)
  const baseSpeed = autoPlayMs ? Math.max(0.1, 4000 / autoPlayMs * 0.22) : 0.22;

  return (
    <SpotlightStage
      activeIndex={0}
      count={items.length}
      enabled={spotlightEnabled}
    >
      <Carousel3DRing
        images={imageUrls}
        height={380}
        speedDeg={reducedMotion ? 0 : baseSpeed}
        autoplay={!reducedMotion && autoPlayMs !== null}
        activeScale={depthConfig[depth].scale}
      />
    </SpotlightStage>
  );
}

// ============== FLAT MODE ==============
interface FlatModeProps {
  items: CardExCarouselItem[];
  autoPlayMs: number | null;
  showLightbox: boolean;
  onEvent?: (event: CardExCarouselEvent) => void;
  spotlightEnabled: boolean;
}

function FlatMode({
  items,
  autoPlayMs,
  showLightbox,
  onEvent,
  spotlightEnabled,
}: FlatModeProps) {
  const reducedMotion = prefersReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const count = items.length;

  const lightboxImages: LightboxImage[] = useMemo(
    () => items.map((item) => ({ url: item.url, alt: item.alt })),
    [items]
  );

  const lightbox = useLightbox({
    images: lightboxImages,
    enabled: showLightbox,
    onOpen: (index) => onEvent?.({ type: "lightbox_open", index, item: items[index] }),
    onClose: (index) => onEvent?.({ type: "lightbox_close", index, item: items[index] }),
    onDownload: (index) => onEvent?.({ type: "download", index, item: items[index] }),
  });

  // Track selected index for spotlight
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    onSelect(); // Initial call

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto-play
  useEffect(() => {
    if (!api || !autoPlayMs || reducedMotion) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, autoPlayMs);

    return () => clearInterval(interval);
  }, [api, autoPlayMs, reducedMotion]);

  const handleImageClick = (index: number) => {
    if (showLightbox) {
      lightbox.openLightbox(index);
    } else {
      onEvent?.({ type: "image_click", index, item: items[index] });
    }
  };

  return (
    <SpotlightStage
      activeIndex={selectedIndex}
      count={count}
      enabled={spotlightEnabled}
    >
      <div className="relative w-full px-12">
        <Carousel
          setApi={setApi}
          opts={{
            align: "center",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {items.map((item, index) => {
              const slideClass = getSlideActiveClass(index, selectedIndex, count, spotlightEnabled);

              return (
                <CarouselItem
                  key={item.id}
                  className={cn(
                    "pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4",
                    slideClass
                  )}
                >
                  <button
                    type="button"
                    className="relative w-full aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onClick={() => handleImageClick(index)}
                    aria-label={item.alt || `View image ${index + 1}`}
                  >
                    <img
                      src={item.url}
                      alt={item.alt ?? ""}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                    {item.badge && (
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </Carousel>

        <LightboxDialog
          open={lightbox.lightboxOpen}
          onOpenChange={lightbox.setLightboxOpen}
          currentImage={lightbox.currentImage}
          index={lightbox.lightboxIndex}
          count={lightbox.count}
          zoomLevel={lightbox.zoomLevel}
          onZoomIn={lightbox.zoomIn}
          onZoomOut={lightbox.zoomOut}
          onResetZoom={lightbox.resetZoom}
          onNext={lightbox.nextImage}
          onPrev={lightbox.prevImage}
          onDownload={lightbox.handleDownload}
          onClose={lightbox.closeLightbox}
        />
      </div>
    </SpotlightStage>
  );
}

// ============== MAIN COMPONENT ==============
export default function CardExCarousel({
  items,
  mode = "roulette",
  autoPlayMs = 4000,
  showLightbox = true,
  visibleSlides = 5,
  className,
  onEvent,
  depth = "medium",
  spotlightEnabled = true,
  direction = "rtl",
  imageSize = "md",
}: CardExCarouselProps) {
  const safeItems = (items || []).slice(0, 20);
  const count = safeItems.length;

  if (!count) return null;

  // Adjust visible slides for mobile
  const [responsiveVisibleSlides, setResponsiveVisibleSlides] = useState(visibleSlides);

  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth < 640) {
        setResponsiveVisibleSlides(3);
      } else if (window.innerWidth < 1024) {
        setResponsiveVisibleSlides(4);
      } else {
        setResponsiveVisibleSlides(visibleSlides);
      }
    };

    updateVisibleSlides();
    window.addEventListener("resize", updateVisibleSlides);
    return () => window.removeEventListener("resize", updateVisibleSlides);
  }, [visibleSlides]);

  return (
    <div className={cn("w-full", className)}>
      {mode === "roulette" && (
        <RouletteMode
          items={safeItems}
          autoPlayMs={autoPlayMs}
          visibleSlides={responsiveVisibleSlides}
          showLightbox={showLightbox}
          onEvent={onEvent}
          depth={depth}
          spotlightEnabled={spotlightEnabled}
          direction={direction}
          imageSize={imageSize}
        />
      )}
      {mode === "ring3d" && (
        <Ring3DMode
          items={safeItems}
          autoPlayMs={autoPlayMs}
          onEvent={onEvent}
          depth={depth}
          spotlightEnabled={spotlightEnabled}
          showLightbox={showLightbox}
        />
      )}
      {mode === "flat" && (
        <FlatMode
          items={safeItems}
          autoPlayMs={autoPlayMs}
          showLightbox={showLightbox}
          onEvent={onEvent}
          spotlightEnabled={spotlightEnabled}
        />
      )}
    </div>
  );
}

// Export types and sub-components
export { SpotlightStage };
