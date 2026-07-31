import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance, extractCoordsFromUrl } from "@/lib/geoDistance";

/** Resolve the user's position only when permission was already granted (no prompt spam). */
async function getGrantedPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (perm && perm.state !== "granted") return null;
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}


export interface DashboardTileStats {
  loading: boolean;
  branches: number;
  nearestBranch: string | null;
  videos: number;
  newVideos: number;
  resources: number;
  latestResource: string | null;
  leads: number;
  appointments: number;
  gallery: number;
}

const emptyStats: DashboardTileStats = {
  loading: true,
  branches: 0,
  nearestBranch: null,
  videos: 0,
  newVideos: 0,
  resources: 0,
  latestResource: null,
  leads: 0,
  appointments: 0,
  gallery: 0,
};

function countJsonArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Read-only aggregation of live counts used by the dashboard command-center tiles.
 * Purely additive: no writes, no schema changes.
 */
export function useDashboardTileStats(): DashboardTileStats {
  const [stats, setStats] = useState<DashboardTileStats>(emptyStats);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        branchesRes,
        nearestRes,
        videosRes,
        newVideosRes,
        filesRes,
        linksRes,
        ambassadorsRes,
        latestFileRes,
        leadsRes,
        apptRes,
        cardsRes,
      ] = await Promise.all([
        supabase.from("directory_entries").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("directory_entries").select("location, maps_link").eq("is_active", true),
        supabase.from("training_items").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("training_items")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("created_at", weekAgo),
        supabase.from("files_repository").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("iam_links").select("id", { count: "exact", head: true }),
        supabase.from("ambassadors_library").select("id", { count: "exact", head: true }),
        supabase
          .from("files_repository")
          .select("file_name")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1),
        user
          ? supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id)
          : Promise.resolve({ count: 0 } as any),
        user
          ? supabase
              .from("card_appointments")
              .select("id", { count: "exact", head: true })
              .eq("owner_user_id", user.id)
          : Promise.resolve({ count: 0 } as any),
        user
          ? supabase
              .from("cards")
              .select("product_images, testimony_images, package_images")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] } as any),
      ]);

      if (cancelled) return;

      const gallery = (cardsRes.data || []).reduce(
        (acc: number, c: any) =>
          acc +
          countJsonArray(c.product_images) +
          countJsonArray(c.testimony_images) +
          countJsonArray(c.package_images),
        0
      );

      setStats({
        loading: false,
        branches: branchesRes.count ?? 0,
        nearestBranch: nearestRes.data?.[0]?.location ?? null,
        videos: videosRes.count ?? 0,
        newVideos: newVideosRes.count ?? 0,
        resources: (filesRes.count ?? 0) + (linksRes.count ?? 0) + (ambassadorsRes.count ?? 0),
        latestResource: latestFileRes.data?.[0]?.file_name ?? null,
        leads: leadsRes.count ?? 0,
        appointments: apptRes.count ?? 0,
        gallery,
      });
    };

    load().catch(() => {
      if (!cancelled) setStats((s) => ({ ...s, loading: false }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
