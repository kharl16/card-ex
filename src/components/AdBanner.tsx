import { useMemo } from "react";
import { useLightbox } from "@/hooks/useLightbox";
import LightboxDialog from "@/components/LightboxDialog";

interface AdBannerData {
  type: "image" | "video";
  url: string;
  link?: string;
}

interface AdBannerProps {
  banner: unknown;
  accentColor?: string;
}

function parse(raw: unknown): AdBannerData | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as any;
  if (!b.url || typeof b.url !== "string") return null;
  if (b.type !== "image" && b.type !== "video") return null;
  return { type: b.type, url: b.url, link: typeof b.link === "string" ? b.link : undefined };
}

/** Extract a YouTube/Vimeo embed URL, or return raw video URL */
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
  return { kind: "video", src: url };
}

export default function AdBanner({ banner, accentColor = "#D4AF37" }: AdBannerProps) {
  const data = useMemo(() => parse(banner), [banner]);

  const lightboxImages = useMemo(
    () => (data?.type === "image" ? [{ url: data.url, alt: "Featured banner" }] : []),
    [data]
  );

  const lightbox = useLightbox({ images: lightboxImages, enabled: lightboxImages.length > 0 });

  if (!data) return null;

  const isImage = data.type === "image";
  const hasLink = !!data.link;

  const frame = (
    <div
      className="relative w-full aspect-video overflow-hidden rounded-2xl glass-shimmer animate-slide-up-fade"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        border: "1px solid var(--glass-border)",
        borderTop: "1px solid var(--glass-border-highlight)",
        boxShadow: `var(--glass-inner-glow), 0 8px 24px ${accentColor}20`,
      }}
    >
      {isImage ? (
        <img
          src={data.url}
          alt="Featured banner"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        (() => {
          const v = getVideoEmbed(data.url);
          return v.kind === "iframe" ? (
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
          );
        })()
      )}
    </div>
  );

  // Video with no link → just render frame
  if (!isImage && !hasLink) return frame;

  // Video with link → wrap in anchor
  if (!isImage && hasLink) {
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

  // Image with link → anchor (link takes precedence)
  if (isImage && hasLink) {
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

  // Image without link → clickable to open zoomable lightbox
  return (
    <>
      <button
        type="button"
        onClick={() => lightbox.openLightbox(0)}
        className="block w-full text-left cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
        aria-label="Open image in zoomable viewer"
      >
        {frame}
      </button>
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
