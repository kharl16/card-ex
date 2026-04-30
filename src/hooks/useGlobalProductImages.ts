import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GlobalProductImage = {
  id: string;
  url: string;
  caption: string | null;
  sort_index: number;
  is_active: boolean;
};

/**
 * Fetches all active global product images plus this card's hide-overrides.
 * Subscribes to realtime changes so toggles sync instantly across tabs/devices.
 * Exposes setHiddenLocal for optimistic updates from callers.
 */
export function useGlobalProductImages(cardId: string | null | undefined) {
  const [allGlobals, setAllGlobals] = useState<GlobalProductImage[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: globals }, overridesResult] = await Promise.all([
      supabase
        .from("global_product_images")
        .select("id,url,caption,sort_index,is_active")
        .eq("is_active", true)
        .order("sort_index", { ascending: true }),
      cardId
        ? supabase
            .from("card_global_image_overrides")
            .select("global_image_id")
            .eq("card_id", cardId)
        : Promise.resolve({ data: [] as { global_image_id: string }[] }),
    ]);

    setAllGlobals((globals as GlobalProductImage[]) ?? []);
    setHiddenIds(
      new Set(
        ((overridesResult.data as { global_image_id: string }[]) ?? []).map(
          (o) => o.global_image_id
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
    window.addEventListener("global-product-override-changed", handler as EventListener);
    return () => window.removeEventListener("global-product-override-changed", handler as EventListener);
  }, [cardId]);

  // Realtime sync across tabs/devices for this card's overrides
  useEffect(() => {
    if (!cardId) return;
    const channel = supabase
      .channel(`card_global_image_overrides:${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_global_image_overrides",
          filter: `card_id=eq.${cardId}`,
        },
        (payload) => {
          setHiddenIds((prev) => {
            const next = new Set(prev);
            if (payload.eventType === "INSERT") {
              const id = (payload.new as { global_image_id: string }).global_image_id;
              next.add(id);
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as { global_image_id: string }).global_image_id;
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
