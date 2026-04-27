import { useMemo } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Video, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

export type AdBanner =
  | { type: "image"; url: string; link?: string }
  | { type: "video"; url: string; link?: string }
  | null;

interface AdBannerSectionProps {
  card: CardData;
  onCardChange: (updates: Partial<CardData>) => void;
}

function parseBanner(raw: unknown): AdBanner {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as any;
  if (!b.url || typeof b.url !== "string") return null;
  if (b.type !== "image" && b.type !== "video") return null;
  return { type: b.type, url: b.url, link: typeof b.link === "string" ? b.link : undefined };
}

export function AdBannerSection({ card, onCardChange }: AdBannerSectionProps) {
  const banner = useMemo(() => parseBanner((card as any).ad_banner), [card]);
  const activeType: "image" | "video" = banner?.type ?? "image";

  const update = (next: AdBanner) => {
    onCardChange({ ad_banner: next as any });
  };

  const clear = () => update(null);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Ad Banner (Featured Media)</h3>
        <p className="text-sm text-muted-foreground">
          Acts like a second cover/logo on your card. Displays to the right of your bio (below the company logo) and above the Products carousel. Leave empty to hide.
        </p>
      </div>

      <Tabs
        value={activeType}
        onValueChange={(v) => {
          // Switching tabs preserves nothing — user re-uploads/re-pastes
          if (v === "image") update(banner?.type === "image" ? banner : null);
          else update(banner?.type === "video" ? banner : null);
        }}
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="image" className="gap-2">
            <ImageIcon className="h-4 w-4" /> Image
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-4 w-4" /> Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-4 space-y-3">
          <ImageUpload
            value={banner?.type === "image" ? banner.url : null}
            onChange={(url) =>
              update(url ? { type: "image", url, link: banner?.link } : null)
            }
            label="Banner Image"
            aspectRatio="aspect-video"
            maxSize={5}
            imageType="cover"
            folderPrefix="ad-banners"
          />
        </TabsContent>

        <TabsContent value="video" className="mt-4 space-y-3">
          <Label htmlFor="ad-banner-video-url">Video URL (YouTube, Vimeo, or .mp4)</Label>
          <Input
            id="ad-banner-video-url"
            placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
            value={banner?.type === "video" ? banner.url : ""}
            onChange={(e) => {
              const url = e.target.value.trim();
              update(url ? { type: "video", url, link: banner?.link } : null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Supports YouTube, Vimeo, or any direct .mp4/.webm URL.
          </p>
        </TabsContent>
      </Tabs>

      {banner && (
        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <Label htmlFor="ad-banner-link">Click-through Link (optional)</Label>
            <Input
              id="ad-banner-link"
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
            Remove banner
          </Button>
        </div>
      )}
    </div>
  );
}
