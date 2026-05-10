import { useMemo } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  Video,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

const MAX_IMAGES = 20;

interface AdBannerItem {
  url: string;
  link?: string;
  alt?: string;
}

export type AdBanner =
  | {
      type: "image";
      items: AdBannerItem[];
      autoPlayMs?: number;
      link?: string;
    }
  | { type: "video"; url: string; link?: string }
  | null;

interface AdBannerSectionProps {
  card: CardData;
  onCardChange: (updates: Partial<CardData>) => void;
}

function parseBanner(raw: unknown): AdBanner {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as any;

  if (b.type === "video") {
    if (!b.url || typeof b.url !== "string") return null;
    return { type: "video", url: b.url, link: typeof b.link === "string" ? b.link : undefined };
  }

  if (b.type === "image") {
    if (Array.isArray(b.items)) {
      const items: AdBannerItem[] = (b.items as any[])
        .filter((it) => it && typeof it.url === "string" && it.url)
        .map((it) => ({
          url: it.url,
          link: typeof it.link === "string" ? it.link : undefined,
          alt: typeof it.alt === "string" ? it.alt : undefined,
        }))
        .slice(0, MAX_IMAGES);
      if (items.length === 0) return null;
      return {
        type: "image",
        items,
        autoPlayMs: typeof b.autoPlayMs === "number" ? b.autoPlayMs : 4000,
        link: typeof b.link === "string" ? b.link : undefined,
      };
    }
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

export function AdBannerSection({ card, onCardChange }: AdBannerSectionProps) {
  const banner = useMemo(() => parseBanner((card as any).ad_banner), [card]);
  const activeType: "image" | "video" = banner?.type ?? "image";

  const update = (next: AdBanner) => {
    onCardChange({ ad_banner: next as any });
  };

  const clear = () => update(null);

  const imageBanner =
    banner?.type === "image"
      ? banner
      : { type: "image" as const, items: [] as AdBannerItem[], autoPlayMs: 4000 };

  const setImageBanner = (next: {
    items: AdBannerItem[];
    autoPlayMs?: number;
    link?: string;
  }) => {
    if (next.items.length === 0) {
      update(null);
      return;
    }
    update({
      type: "image",
      items: next.items.slice(0, MAX_IMAGES),
      autoPlayMs: next.autoPlayMs ?? imageBanner.autoPlayMs ?? 4000,
      link: next.link ?? imageBanner.link,
    });
  };

  const addImage = (url: string | null) => {
    if (!url) return;
    if (imageBanner.items.length >= MAX_IMAGES) return;
    setImageBanner({
      items: [...imageBanner.items, { url }],
      autoPlayMs: imageBanner.autoPlayMs,
      link: imageBanner.link,
    });
  };

  const updateItem = (idx: number, patch: Partial<AdBannerItem>) => {
    setImageBanner({
      items: imageBanner.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
      autoPlayMs: imageBanner.autoPlayMs,
      link: imageBanner.link,
    });
  };

  const removeItem = (idx: number) => {
    setImageBanner({
      items: imageBanner.items.filter((_, i) => i !== idx),
      autoPlayMs: imageBanner.autoPlayMs,
      link: imageBanner.link,
    });
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...imageBanner.items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setImageBanner({
      items: next,
      autoPlayMs: imageBanner.autoPlayMs,
      link: imageBanner.link,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Ad Banner (Featured Media)</h3>
        <p className="text-sm text-muted-foreground">
          Acts like a second cover/logo on your card. Add up to {MAX_IMAGES} images and they'll
          rotate as a swipeable carousel above the Products section. Or use a single video.
        </p>
      </div>

      <Tabs
        value={activeType}
        onValueChange={(v) => {
          if (v === "image") update(banner?.type === "image" ? banner : null);
          else update(banner?.type === "video" ? banner : null);
        }}
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="image" className="gap-2">
            <ImageIcon className="h-4 w-4" /> Images
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-4 w-4" /> Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-4 space-y-4">
          {/* Uploader for new image */}
          {imageBanner.items.length < MAX_IMAGES && (
            <ImageUpload
              value={null}
              onChange={addImage}
              label={`Add Banner Image (${imageBanner.items.length}/${MAX_IMAGES})`}
              aspectRatio="aspect-video"
              maxSize={5}
              imageType="cover"
              folderPrefix="ad-banners"
            />
          )}

          {/* Existing items list */}
          {imageBanner.items.length > 0 && (
            <div className="space-y-3">
              <Label>Banner Images ({imageBanner.items.length})</Label>
              <div className="space-y-2">
                {imageBanner.items.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className="flex gap-3 rounded-lg border p-2"
                  >
                    <img
                      src={item.url}
                      alt={`Banner ${idx + 1}`}
                      className="h-16 w-28 flex-shrink-0 rounded object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        placeholder="Optional click-through link"
                        value={item.link || ""}
                        onChange={(e) =>
                          updateItem(idx, { link: e.target.value.trim() || undefined })
                        }
                        className="h-8 text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, -1)}
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === imageBanner.items.length - 1}
                          onClick={() => moveItem(idx, 1)}
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <span className="ml-1 text-xs text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                          onClick={() => removeItem(idx)}
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {imageBanner.items.length > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="ad-banner-autoplay">Auto-play interval</Label>
                <Select
                  value={String(imageBanner.autoPlayMs ?? 4000)}
                  onValueChange={(v) =>
                    setImageBanner({
                      items: imageBanner.items,
                      autoPlayMs: Number(v),
                      link: imageBanner.link,
                    })
                  }
                >
                  <SelectTrigger id="ad-banner-autoplay">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="3000">3 seconds</SelectItem>
                    <SelectItem value="4000">4 seconds (default)</SelectItem>
                    <SelectItem value="6000">6 seconds</SelectItem>
                    <SelectItem value="8000">8 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-banner-link">
                  Default click-through link (optional)
                </Label>
                <Input
                  id="ad-banner-link"
                  placeholder="https://your-promo-page.com"
                  value={imageBanner.link || ""}
                  onChange={(e) =>
                    setImageBanner({
                      items: imageBanner.items,
                      autoPlayMs: imageBanner.autoPlayMs,
                      link: e.target.value.trim() || undefined,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Used for slides without their own link. Slides with no link will open
                  full-screen with zoom instead.
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={clear} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Remove all images
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="mt-4 space-y-3">
          <Label htmlFor="ad-banner-video-url">Video URL (YouTube, Vimeo, or .mp4)</Label>
          <Input
            id="ad-banner-video-url"
            placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
            value={banner?.type === "video" ? banner.url : ""}
            onChange={(e) => {
              const url = e.target.value.trim();
              update(
                url
                  ? {
                      type: "video",
                      url,
                      link: banner?.type === "video" ? banner.link : undefined,
                    }
                  : null
              );
            }}
          />
          <p className="text-xs text-muted-foreground">
            Supports YouTube, Vimeo, or any direct .mp4/.webm URL.
          </p>

          {banner?.type === "video" && (
            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <Label htmlFor="ad-banner-video-link">Click-through Link (optional)</Label>
                <Input
                  id="ad-banner-video-link"
                  placeholder="https://your-promo-page.com"
                  value={banner.link || ""}
                  onChange={(e) => {
                    const link = e.target.value.trim();
                    update({ ...banner, link: link || undefined });
                  }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={clear} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Remove video
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
