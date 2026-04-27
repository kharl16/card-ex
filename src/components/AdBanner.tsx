import { useMemo } from "react";

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
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      kind: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  // Direct video file
  return { kind: "video", src: url };
}

export default function AdBanner({ banner, accentColor = "#D4AF37" }: AdBannerProps) {
  const data = useMemo(() => parse(banner), [banner]);
  if (!data) return null;

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
      {data.type === "image" ? (
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
