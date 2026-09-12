import React, { useMemo, useState } from "react";
import LightboxDialog from "@/components/LightboxDialog";
import VideoFullscreenDialog from "@/components/video/VideoFullscreenDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLightbox } from "@/hooks/useLightbox";
import ShowcaseHero from "@/components/showcase/ShowcaseHero";
import ShowcaseRow, { type ShowcaseRowTile } from "@/components/showcase/ShowcaseRow";
import ShowcaseViewAllDialog from "@/components/showcase/ShowcaseViewAllDialog";
import { getThumbnailUrl, type VideoItem } from "@/lib/videoUtils";
import type { ShowcaseCategory } from "@/lib/showcase";
import type { CarouselKey, CarouselSettingsData, CarouselSection } from "@/lib/carouselTypes";
import type { LightboxImage } from "@/hooks/useLightbox";
import { toast } from "sonner";

interface ContactInfo {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface ImmersiveShowcaseProps {
  categories: ShowcaseCategory[];
  settings: CarouselSettingsData;
  contactInfo?: ContactInfo;
  isInteractive?: boolean;
  shareUrl?: string;
}

interface RowModel {
  key: CarouselKey;
  title: string;
  aspect: "portrait" | "video";
  tiles: ShowcaseRowTile[];
  images: LightboxImage[];
  videos: VideoItem[];
  cta?: CarouselSection["cta"];
}

const SCROLL_TARGETS: Record<string, string> = {
  top: "body",
  contact: "#contact-section",
  carousel_brochure: "#showcase-brochure",
  carousel_products: "#showcase-products",
  carousel_packages: "#showcase-packages",
  carousel_testimonies: "#showcase-testimonies",
};

/**
 * Netflix-inspired presentation of the exact same showcase content used by the
 * classic carousels. Purely a rendering layer: no content is created or removed.
 */
export default function ImmersiveShowcase({
  categories,
  settings,
  contactInfo = {},
  isInteractive = true,
  shareUrl,
}: ImmersiveShowcaseProps) {
  const rows: RowModel[] = useMemo(
    () =>
      categories
        .filter((category) => category.isVisible)
        .map((category) => {
          const cta = settings[category.key]?.cta;

          if (category.key === "videos") {
            const videos = category.videos.filter((v) => !v.hidden);
            return {
              key: category.key,
              title: category.title,
              aspect: "video" as const,
              images: [],
              videos,
              cta,
              tiles: videos.map((video, index) => ({
                id: `${category.key}-${index}`,
                src: getThumbnailUrl(video.url) || "",
                alt: video.title || `${category.title} ${index + 1}`,
                caption: video.title || undefined,
                isVideo: true,
                originalIndex: index,
              })),
            };
          }

          const images = category.images.filter((img) => !img.hidden);
          return {
            key: category.key,
            title: category.title,
            aspect: "portrait" as const,
            videos: [],
            cta,
            images: images.map((img) => ({
              url: img.url,
              alt: img.alt,
              shareText: img.shareText,
              description: img.description,
              srp: img.srp,
            })),
            tiles: images.map((img, index) => ({
              id: `${category.key}-${index}`,
              src: img.url,
              alt: img.alt || `${category.title} ${index + 1}`,
              caption: img.alt || img.description || undefined,
              srp: img.srp,
              originalIndex: index,
            })),
          };
        })
        .filter((row) => row.tiles.length > 0),
    [categories, settings]
  );

  const [activeImageRow, setActiveImageRow] = useState<CarouselKey | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [viewAllKey, setViewAllKey] = useState<CarouselKey | null>(null);
  const [ctaModal, setCtaModal] = useState<{ label: string; content: React.ReactNode } | null>(null);

  const activeImages = rows.find((r) => r.key === activeImageRow)?.images ?? [];
  const lightbox = useLightbox({ images: activeImages, enabled: isInteractive });

  const videoRow = rows.find((r) => r.key === "videos");
  const videoCount = videoRow?.videos.length ?? 0;

  if (rows.length === 0) return null;

  const openImages = (rowKey: CarouselKey, index: number) => {
    if (!isInteractive) return;
    setActiveImageRow(rowKey);
    // Defer so the lightbox reads the newly selected row's images.
    requestAnimationFrame(() => lightbox.openLightbox(index));
  };

  const openVideo = (index: number) => {
    if (!isInteractive) return;
    setVideoIndex(index);
    setVideoOpen(true);
  };

  const handleSelect = (row: RowModel, index: number) => {
    if (row.key === "videos") openVideo(index);
    else openImages(row.key, index);
  };

  const handleCta = (row: RowModel) => {
    if (!isInteractive) return;
    const cta = row.cta;
    if (!cta?.enabled) return;

    switch (cta.action) {
      case "link":
        if (cta.href) window.open(cta.href, cta.target || "_blank");
        else toast.error("Link URL not configured");
        break;

      case "scroll": {
        const target = document.querySelector(SCROLL_TARGETS[cta.scroll_target || ""] || "body");
        target?.scrollIntoView({ behavior: "smooth" });
        break;
      }

      case "contact": {
        const { phone, email } = contactInfo;
        const cleanPhone = phone?.replace(/\D/g, "");
        switch (cta.contact_method) {
          case "whatsapp":
            if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, "_blank");
            else toast.error("Phone number not configured");
            break;
          case "viber":
            if (cleanPhone) window.open(`viber://chat?number=${cleanPhone}`, "_blank");
            else toast.error("Phone number not configured");
            break;
          case "sms":
            if (phone) window.open(`sms:${phone}`, "_self");
            else toast.error("Phone number not configured");
            break;
          case "email":
            if (email) window.open(`mailto:${email}`, "_self");
            else toast.error("Email not configured");
            break;
          case "phone":
            if (phone) window.open(`tel:${phone}`, "_self");
            else toast.error("Phone number not configured");
            break;
          default:
            window.open("https://m.me/", "_blank");
        }
        break;
      }

      case "modal":
        if (cta.modal_content) {
          setCtaModal({ label: cta.label || "Details", content: cta.modal_content });
        } else {
          toast.error("Modal content not configured");
        }
        break;
    }
  };

  const heroRow = rows[0];
  const heroTile = heroRow.tiles[0];
  const viewAllRow = rows.find((r) => r.key === viewAllKey) ?? null;

  return (
    <div
      className="relative w-full"
      style={{
        background: [
          "radial-gradient(120% 60% at 50% 0%, hsl(var(--primary) / 0.14) 0%, transparent 60%)",
          "radial-gradient(80% 40% at 85% 45%, hsl(var(--primary) / 0.08) 0%, transparent 65%)",
          "radial-gradient(70% 35% at 10% 80%, hsl(var(--primary) / 0.07) 0%, transparent 60%)",
          "linear-gradient(180deg, #050608 0%, #0a0c12 45%, #050608 100%)",
        ].join(", "),
      }}
    >
      {heroTile?.src && (
        <ShowcaseHero
          src={heroTile.src}
          title={heroTile.alt}
          subtitle={heroTile.caption}
          categoryLabel={heroRow.title}
          isVideo={heroRow.key === "videos"}
          onOpen={() => handleSelect(heroRow, 0)}
          onBrowse={() => setViewAllKey(heroRow.key)}
        />
      )}

      <div className="relative z-10 pt-2 pb-4">
        {rows.map((row) => (
          <ShowcaseRow
            key={row.key}
            id={`showcase-${row.key}`}
            title={row.title}
            tiles={row.tiles}
            totalCount={row.tiles.length}
            aspect={row.aspect}
            onSelect={(index) => handleSelect(row, index)}
            onViewAll={() => setViewAllKey(row.key)}
            ctaLabel={row.cta?.enabled ? row.cta.label || undefined : undefined}
            onCta={row.cta?.enabled ? () => handleCta(row) : undefined}
          />
        ))}
      </div>

      {viewAllRow && (
        <ShowcaseViewAllDialog
          open={!!viewAllKey}
          onOpenChange={(open) => !open && setViewAllKey(null)}
          title={viewAllRow.title}
          tiles={viewAllRow.tiles}
          aspect={viewAllRow.aspect}
          onSelect={(index) => {
            const tile = viewAllRow.tiles[index];
            handleSelect(viewAllRow, tile?.originalIndex ?? index);
          }}
        />
      )}

      <Dialog open={!!ctaModal} onOpenChange={(open) => !open && setCtaModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ctaModal?.label || "Details"}</DialogTitle>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none">{ctaModal?.content}</div>
        </DialogContent>
      </Dialog>

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
        shareUrl={shareUrl}
        images={activeImages}
      />

      {videoRow && (
        <VideoFullscreenDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          video={videoRow.videos[videoIndex]}
          index={videoIndex}
          count={videoCount}
          onNext={() => setVideoIndex((i) => (videoCount ? (i + 1) % videoCount : 0))}
          onPrev={() =>
            setVideoIndex((i) => (videoCount ? (i - 1 + videoCount) % videoCount : 0))
          }
        />
      )}
    </div>
  );
}
