import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GlobalPackageImage = {
  id: string;
  url: string;
  caption: string | null;
  sort_index: number;
  is_active: boolean;
};

/**
 * Fetches all active global package images plus this card's hide-overrides.
 * Subscribes to realtime changes so toggles sync instantly across tabs/devices.
 * Mirrors useGlobalProductImages but for the "Packages" carousel.
 */
export function useGlobalPackageImages(cardId: string | null | undefined) {
  const [allGlobals, setAllGlobals] = useState<GlobalPackageImage[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: globals }, overridesResult] = await Promise.all([
      supabase
        .from("global_package_images")
        .select("id,url,caption,sort_index,is_active")
        .eq("is_active", true)
        .order("sort_index", { ascending: true }),
      cardId
        ? supabase
            .from("card_global_package_overrides")
            .select("global_package_image_id")
            .eq("card_id", cardId)
        : Promise.resolve({ data: [] as { global_package_image_id: string }[] }),
    ]);

    setAllGlobals((globals as GlobalPackageImage[]) ?? []);
    setHiddenIds(
      new Set(
        ((overridesResult.data as { global_package_image_id: string }[]) ?? []).map(
          (o) => o.global_package_image_id
        )
      )
    );
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  // Cross-component instant sync within the same tab (toggle button -> preview)
  useEffect(() => {
    if (!cardId) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { cardId: string; id: string; hidden: boolean };
      if (!detail || detail.cardId !== cardId) return;
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (detail.hidden) next.add(detail.id);
        else next.delete(detail.id);
        return next;
      });
    };
    window.addEventListener("global-package-override-changed", handler as EventListener);
    return () => window.removeEventListener("global-package-override-changed", handler as EventListener);
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    const channel = supabase
      .channel(`card_global_package_overrides:${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_global_package_overrides",
          filter: `card_id=eq.${cardId}`,
        },
        (payload) => {
          setHiddenIds((prev) => {
            const next = new Set(prev);
            if (payload.eventType === "INSERT") {
              const id = (payload.new as { global_package_image_id: string }).global_package_image_id;
              next.add(id);
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as { global_package_image_id: string }).global_package_image_id;
              next.delete(id);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cardId]);

  const setHiddenLocal = useCallback((id: string, hidden: boolean) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const visibleGlobals = allGlobals.filter((g) => !hiddenIds.has(g.id));

  return { allGlobals, hiddenIds, visibleGlobals, loading, reload: load, setHiddenLocal };
}
