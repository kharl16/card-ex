import { useGlobalLibraryRefresh } from "./useGlobalLibraryRefresh";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseVideoUrl, type VideoItem } from "@/lib/videoUtils";

/** Active super-admin Global Videos, shown on every card's Videos carousel. */
export function useGlobalVideos(): VideoItem[] {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useGlobalLibraryRefresh("global_videos", reload);
  useEffect(() => {
    let alive = true;
    (supabase as any)
      .from("global_videos")
      .select("url,title,description,sort_index")
      .eq("is_active", true)
      .order("sort_index", { ascending: true }).order("created_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => {
        if (!alive) return;
        setVideos(
          (data ?? [])
            .map((r, i) => {
              const v = parseVideoUrl(r.url, 10000 + i);
              return v ? { ...v, title: r.title || v.title, description: r.description || undefined } : null;
            })
            .filter(Boolean) as VideoItem[]
        );
      });
    return () => { alive = false; };
  }, [revision]);
  return videos;
}
