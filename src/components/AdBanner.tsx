import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLightbox } from "@/hooks/useLightbox";
import LightboxDialog from "@/components/LightboxDialog";

interface AdBannerItem {
  url: string;
  link?: string;
  alt?: string;
}

interface AdBannerImageData {
  type: "image";
  items: AdBannerItem[];
  autoPlayMs?: number;
  link?: string;
}

interface AdBannerVideoData {
  type: "video";
  url: string;
  link?: string;
}

type AdBannerData = AdBannerImageData | AdBannerVideoData;

interface AdBannerProps {
  banner: unknown;
  accentColor?: string;
}

function parse(raw: unknown): AdBannerData | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as any;

  if (b.type === "video") {
    if (!b.url || typeof b.url !== "string") return null;
    return { type: "video", url: b.url, link: typeof b.link === "string" ? b.link : undefined };
  }

  if (b.type === "image") {
    // New shape: items[]
    if (Array.isArray(b.items)) {
      const items = (b.items as any[])
        .filter((it) => it && typeof it.url === "string" && it.url)
        .map((it) => ({
          url: it.url as string,
          link: typeof it.link === "string" ? it.link : undefined,
          alt: typeof it.alt === "string" ? it.alt : undefined,
        }))
        .slice(0, 20);
      if (items.length === 0) return null;
      return {
        type: "image",
        items,
        autoPlayMs: typeof b.autoPlayMs === "number" ? b.autoPlayMs : 4000,
        link: typeof b.link === "string" ? b.link : undefined,
      };
    }
    // Legacy shape: single url
    if (typeof b.url === "string" && b.url) {
      return {
        type: "image",
        items: [{ url: b.url, link: typeof b.link === "string" ? b.link : undefined }],
        autoPlayMs: 4000,
        link: typeof b.link === "string" ? b.link : undefined,
      };
    }
  }

  return null;
}

function getVideoEmbed(url: string): { kind: "iframe" | "video"; src: string } {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      kind: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  // Facebook videos (watch, reels, /videos/, fb.watch short links, share/v/)
  const fbPatterns = [
    /facebook\.com\/.+\/videos\/\d+/i,
    /facebook\.com\/watch\/?\?v=\d+/i,
    /facebook\.com\/reel\/\d+/i,
    /facebook\.com\/share\/v\/[A-Za-z0-9_-]+/i,
    /facebook\.com\/video\.php\?v=\d+/i,
    /fb\.watch\/[A-Za-z0-9_-]+/i,
  ];
  if (fbPatterns.some((p) => p.test(url))) {
    const params = new URLSearchParams({
      href: url,
      show_text: "false",
      width: "560",
    });
    return {
      kind: "iframe",
      src: `https://www.facebook.com/plugins/video.php?${params.toString()}`,
    };
  }
  return { kind: "video", src: url };
}

const FRAME_CLASSES =
  "relative w-full aspect-video overflow-hidden rounded-2xl glass-shimmer animate-slide-up-fade";

function frameStyle(accentColor: string): React.CSSProperties {
  return {
    background: "var(--glass-bg)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    border: "1px solid var(--glass-border)",
    borderTop: "1px solid var(--glass-border-highlight)",
    boxShadow: `var(--glass-inner-glow), 0 8px 24px ${accentColor}20`,
  };
}

function ImageCarousel({
  items,
  autoPlayMs,
  accentColor,
  onItemClick,
}: {
  items: AdBannerItem[];
  autoPlayMs: number;
  accentColor: string;
  onItemClick: (index: number) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  // Simple autoplay (paused on hover)
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!emblaApi || !autoPlayMs || autoPlayMs <= 0 || paused || items.length <= 1) return;
    const id = window.setInterval(() => {
      if (!emblaApi) return;
      emblaApi.scrollNext();
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [emblaApi, autoPlayMs, paused, items.length]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div
      className={FRAME_CLASSES}
      style={frameStyle(accentColor)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={emblaRef} className="h-full w-full overflow-hidden">
        <div className="flex h-full">
          {items.map((item, idx) => (
            <div key={`${item.url}-${idx}`} className="relative h-full min-w-0 flex-[0_0_100%]">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full w-full"
                  aria-label={item.alt || `Banner ${idx + 1}`}
                >
                  <img
                    src={item.url}
                    alt={item.alt || `Banner ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onItemClick(idx)}
                  className="block h-full w-full cursor-zoom-in text-left"
                  aria-label="Open image in zoomable viewer"
                >
                  <img
                    src={item.url}
                    alt={item.alt || `Banner ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100 md:opacity-0 md:hover:opacity-100"
            style={{ opacity: 0.7 }}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:bg-black/60"
            style={{ opacity: 0.7 }}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => emblaApi?.scrollTo(idx)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: idx === selectedIndex ? 18 : 6,
                  background:
                    idx === selectedIndex ? accentColor : "rgba(255,255,255,0.5)",
                }}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdBanner({ banner, accentColor = "#D4AF37" }: AdBannerProps) {
  const data = useMemo(() => parse(banner), [banner]);

  const lightboxImages = useMemo(
    () =>
      data?.type === "image"
        ? data.items.map((it, i) => ({ url: it.url, alt: it.alt || `Banner ${i + 1}` }))
        : [],
    [data]
  );

  const lightbox = useLightbox({ images: lightboxImages, enabled: lightboxImages.length > 0 });

  if (!data) return null;

  // VIDEO branch (unchanged behavior)
  if (data.type === "video") {
    const v = getVideoEmbed(data.url);
    const frame = (
      <div className={FRAME_CLASSES} style={frameStyle(accentColor)}>
        {v.kind === "iframe" ? (
          <iframe
            src={v.src}
            title="Featured video"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={v.src}
            className="w-full h-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        )}
      </div>
    );
    if (data.link) {
      return (
        <a
          href={data.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:scale-[1.01] transition-transform duration-300"
        >
          {frame}
        </a>
      );
    }
    return frame;
  }

  // IMAGE branch — single or carousel, both inside the same glass frame
  const items = data.items;

  return (
    <>
      <ImageCarousel
        items={items}
        autoPlayMs={data.autoPlayMs ?? 4000}
        accentColor={accentColor}
        onItemClick={(idx) => lightbox.openLightbox(idx)}
      />
      <LightboxDialog
        open={lightbox.lightboxOpen}
        onOpenChange={lightbox.setLightboxOpen}
        currentImage={lightbox.currentImage}
        index={lightbox.lightboxIndex}
        count={lightbox.count}
        zoomLevel={lightbox.zoomLevel}
        setZoomLevel={lightbox.setZoomLevel}
        onZoomIn={lightbox.zoomIn}
        onZoomOut={lightbox.zoomOut}
        onResetZoom={lightbox.resetZoom}
        onNext={lightbox.nextImage}
        onPrev={lightbox.prevImage}
        onDownload={lightbox.handleDownload}
        onClose={lightbox.closeLightbox}
      />
    </>
  );
}
