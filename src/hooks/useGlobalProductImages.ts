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
 * Returns the visible globals (with overrides excluded), the full list,
 * and the set of hidden ids — so callers can either render or manage them.
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

  const visibleGlobals = allGlobals.filter((g) => !hiddenIds.has(g.id));

  return { allGlobals, hiddenIds, visibleGlobals, loading, reload: load };
}
