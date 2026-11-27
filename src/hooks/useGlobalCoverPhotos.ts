import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRenderUrl } from "@/lib/images";
import type { VideoItem } from "@/lib/videoUtils";

/** Active super-admin cover photos, shown as photo slides on every card's Videos carousel. */
export function useGlobalCoverPhotos(): VideoItem[] {
  const [photos, setPhotos] = useState<VideoItem[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("global_cover_photos")
      .select("url,title,sort_index")
      .eq("is_active", true)
      .order("sort_index", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setPhotos(
          (data ?? []).map((row, index) => ({
            url: row.url,
            source: "unknown",
            mediaType: "image",
            thumbnail: getRenderUrl(row.url, "cover", "default"),
            title: row.title || undefined,
            order: 10000 + index,
          }))
        );
      });

    return () => { alive = false; };
  }, []);

  return photos;
}
