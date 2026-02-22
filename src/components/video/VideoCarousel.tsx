import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Play, Share2, Download, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoFullscreenDialog from "@/components/video/VideoFullscreenDialog";
import {
  getEmbedUrl,
  getThumbnailUrl,
  getShareUrl,
  getDownloadUrl,
  type VideoItem,
} from "@/lib/videoUtils";
import { toast } from "sonner";

interface VideoCarouselProps {
  videos: VideoItem[];
  autoPlayMs?: number;
  imageSize?: "sm" | "md" | "lg";
  imageGap?: number;
  direction?: "ltr" | "rtl";
  shareUrl?: string;
}

const sizeConfig = {
  sm: "h-[140px] sm:h-[160px]",
  md: "h-[200px] sm:h-[220px]",
  lg: "h-[260px] sm:h-[300px]",
};

export default function VideoCarousel({
  videos,
  autoPlayMs = 0,
  imageSize = "md",
  imageGap = 12,
  direction = "ltr",
  shareUrl,
}: VideoCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  // Track active slide
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActiveIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => { api.off("select", onSelect); };
  }, [api]);

  const openFullscreen = useCallback((index: number) => {
    setFullscreenIndex(index);
    setFullscreenOpen(true);
  }, []);

  const nextVideo = useCallback(() => {
    setFullscreenIndex((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  const prevVideo = useCallback(() => {
    setFullscreenIndex((prev) => (prev - 1 + videos.length) % videos.length);
  }, [videos.length]);

  const handleShare = useCallback(async (video: VideoItem) => {
    const link = getShareUrl(video.url);
    const text = `🎬 ${video.title || "Check out this video!"}\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title || "Video", url: link });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied!");
    }
  }, []);

  if (videos.length === 0) return null;

  const heightClass = sizeConfig[imageSize] || sizeConfig.md;

  return (
    <>
      <div className="relative w-full px-8">
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: true, direction: direction === "rtl" ? "rtl" : "ltr" }}
          className="w-full"
        >
          <CarouselContent
            className="-ml-1"
            style={{ gap: `${imageGap}px` }}
          >
            {videos.map((video, index) => {
              const isActive = index === activeIndex;
              const thumbnail = video.thumbnail || getThumbnailUrl(video.url);
              const embedUrl = getEmbedUrl(video.url, true);

              return (
                <CarouselItem
                  key={`video-${index}`}
                  className={cn(
                    "pl-1 basis-4/5 sm:basis-3/5 md:basis-1/2 transition-all duration-300",
                    isActive ? "scale-100 opacity-100" : "scale-95 opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "relative w-full overflow-hidden rounded-xl bg-muted border border-border/50",
                      heightClass
                    )}
                  >
                    {/* Active slide plays video, others show thumbnail */}
                    {isActive && embedUrl ? (
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={video.title || `Video ${index + 1}`}
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full h-full flex items-center justify-center cursor-pointer group"
                        onClick={() => openFullscreen(index)}
                      >
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={video.title || `Video ${index + 1}`}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Film className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="h-7 w-7 text-foreground ml-1" />
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Overlay controls for active slide */}
                    {isActive && (
                      <div className="absolute bottom-2 right-2 z-10 flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full"
                          onClick={(e) => { e.stopPropagation(); openFullscreen(index); }}
                          aria-label="Fullscreen"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full"
                          onClick={(e) => { e.stopPropagation(); handleShare(video); }}
                          aria-label="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {getDownloadUrl(video.url) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dl = getDownloadUrl(video.url);
                              if (dl) window.open(dl, "_blank");
                            }}
                            aria-label="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Title overlay */}
                    {video.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                        <p className="text-white text-sm font-medium truncate">{video.title}</p>
                      </div>
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </Carousel>
      </div>

      <VideoFullscreenDialog
        open={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        video={videos[fullscreenIndex]}
        index={fullscreenIndex}
        count={videos.length}
        onNext={nextVideo}
        onPrev={prevVideo}
      />
    </>
  );
}
