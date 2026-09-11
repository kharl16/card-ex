import React, { useMemo, useState } from "react";
import LightboxDialog from "@/components/LightboxDialog";
import VideoFullscreenDialog from "@/components/video/VideoFullscreenDialog";
import { useLightbox } from "@/hooks/useLightbox";
import ShowcaseHero from "@/components/showcase/ShowcaseHero";
import ShowcaseRow, { type ShowcaseRowTile } from "@/components/showcase/ShowcaseRow";
import ShowcaseViewAllDialog from "@/components/showcase/ShowcaseViewAllDialog";
import { getThumbnailUrl, type VideoItem } from "@/lib/videoUtils";
import type { ShowcaseCategory } from "@/lib/showcase";
import type { CarouselKey } from "@/lib/carouselTypes";
import type { LightboxImage } from "@/hooks/useLightbox";

interface ImmersiveShowcaseProps {
  categories: ShowcaseCategory[];
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
}

/**
 * Netflix-inspired presentation of the exact same showcase content used by the
 * classic carousels. Purely a rendering layer: no content is created or removed.
 */
export default function ImmersiveShowcase({
  categories,
  isInteractive = true,
  shareUrl,
}: ImmersiveShowcaseProps) {
  const rows: RowModel[] = useMemo(
    () =>
      categories
        .filter((category) => category.isVisible)
        .map((category) => {
          if (category.key === "videos") {
            const videos = category.videos.filter((v) => !v.hidden);
            return {
              key: category.key,
              title: category.title,
              aspect: "video" as const,
              images: [],
              videos,
              tiles: videos.map((video, index) => ({
                id: `${category.key}-${index}`,
                src: getThumbnailUrl(video.url) || "",
                alt: video.title || `${category.title} ${index + 1}`,
                caption: video.title || undefined,
                isVideo: true,
              })),
            };
          }

          const images = category.images.filter((img) => !img.hidden);
          return {
            key: category.key,
            title: category.title,
            aspect: "portrait" as const,
            videos: [],
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
            })),
          };
        })
        .filter((row) => row.tiles.length > 0),
    [categories]
  );

  const [activeImageRow, setActiveImageRow] = useState<CarouselKey | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [viewAllKey, setViewAllKey] = useState<CarouselKey | null>(null);

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

  const heroRow = rows[0];
  const heroTile = heroRow.tiles[0];
  const viewAllRow = rows.find((r) => r.key === viewAllKey) ?? null;

  return (
    <div className="relative w-full bg-black">
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

      <div className="relative z-10 -mt-4 pb-4">
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
          onSelect={(index) => handleSelect(viewAllRow, index)}
        />
      )}

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
