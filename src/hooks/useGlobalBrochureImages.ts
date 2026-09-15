import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BrochurePageShape } from "@/lib/carouselTypes";

export type GlobalBrochureImage = {
  id: string;
  url: string;
  url_2: string | null;
  caption: string | null;
  srp: string | null;
  sort_index: number;
  is_active: boolean;
  section_id?: string | null;
};

export type GlobalBrochureMeta = {
  id: string;
  title: string;
  intro: string | null;
  page_shape: BrochurePageShape;
};

export type GlobalBrochureSection = {
  id: string;
  heading: string;
  body: string | null;
  sort_index: number;
  /** When set (applied brochure template), these page ids belong to the section */
  imageIds?: string[];
};

/** Page layout stored on a card by an applied brochure template */
export type CardBrochureLayout = {
  title?: string | null;
  intro?: string | null;
  sections?: { id: string; heading: string; body?: string | null; image_ids?: string[] }[];
};

/**
 * Fetches all active global brochure images plus this card's hide-overrides.
 * Mirrors useGlobalPackageImages but for the "Company Brochure" section.
 */
export function useGlobalBrochureImages(cardId: string | null | undefined) {
  const [allGlobals, setAllGlobals] = useState<GlobalBrochureImage[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [brochure, setBrochure] = useState<GlobalBrochureMeta | null>(null);
  const [sections, setSections] = useState<GlobalBrochureSection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    let companyId: string | null = null;
    let layout: CardBrochureLayout | null = null;
    if (cardId) {
      const { data: cardRow } = await supabase
        .from("cards")
        .select("company_id,carousel_settings")
        .eq("id", cardId)
        .maybeSingle();
      companyId = (cardRow as { company_id: string | null } | null)?.company_id ?? null;
      const settings = (cardRow as any)?.carousel_settings as Record<string, any> | null;
      const stored = settings?.brochure?.layout as CardBrochureLayout | undefined;
      if (stored && (stored.title || stored.intro || stored.sections?.length)) layout = stored;
    }
    const { data: def } = await supabase.rpc("default_company_id");
    const defaultCompanyId = (def as string | null) ?? null;
    if (!companyId) companyId = defaultCompanyId;

    const fetchImages = async (company: string | null) => {
      let q = supabase
        .from("global_brochure_images")
        .select("id,url,url_2,caption,srp,sort_index,is_active,section_id")
        .eq("is_active", true)
        .order("sort_index", { ascending: true });
      if (company) q = q.eq("company_id", company);
      const { data } = await q;
      return (data as GlobalBrochureImage[]) ?? [];
    };

    let images = await fetchImages(companyId);
    // Cards whose company has no library of its own still show the default
    // company's shared brochure, so every card gets the pages.
    if (images.length === 0 && defaultCompanyId && defaultCompanyId !== companyId) {
      images = await fetchImages(defaultCompanyId);
      companyId = defaultCompanyId;
    }

    let brochureQuery = supabase
      .from("global_brochures")
        .select("id,title,intro,page_shape,sort_index")
      .eq("is_active", true)
      .order("sort_index", { ascending: true })
      .limit(1);
    if (companyId) brochureQuery = brochureQuery.eq("company_id", companyId);

    const [{ data: brochureRows }, overridesResult] = await Promise.all([
      brochureQuery,
      cardId
        ? supabase
            .from("card_global_brochure_overrides")
            .select("global_brochure_image_id")
            .eq("card_id", cardId)
        : Promise.resolve({ data: [] as { global_brochure_image_id: string }[] }),
    ]);

    const libraryMeta = ((brochureRows as GlobalBrochureMeta[]) ?? [])[0] ?? null;

    // A brochure template applied to this card wins over the company library,
    // so the card shows exactly the page layout the admin set up for it.
    if (layout) {
      setBrochure({
        id: libraryMeta?.id ?? "card-layout",
        title: layout.title || libraryMeta?.title || "Company Brochure",
        intro: layout.intro ?? libraryMeta?.intro ?? null,
        page_shape: libraryMeta?.page_shape ?? "portrait",
      });
      setSections(
        (layout.sections ?? []).map((s, i) => ({
          id: s.id,
          heading: s.heading,
          body: s.body ?? null,
          sort_index: i,
          imageIds: s.image_ids ?? [],
        }))
      );
    } else {
      setBrochure(libraryMeta);
      if (libraryMeta) {
        const { data: sectionRows } = await supabase
          .from("global_brochure_sections")
          .select("id,heading,body,sort_index")
          .eq("brochure_id", libraryMeta.id)
          .order("sort_index", { ascending: true });
        setSections((sectionRows as GlobalBrochureSection[]) ?? []);
      } else {
        setSections([]);
      }
    }

    setAllGlobals(images);
    setHiddenIds(
      new Set(
        ((overridesResult.data as { global_brochure_image_id: string }[]) ?? []).map(
          (o) => o.global_brochure_image_id
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
    window.addEventListener("global-brochure-override-changed", handler as EventListener);
    return () =>
      window.removeEventListener("global-brochure-override-changed", handler as EventListener);
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    const channel = supabase
      .channel(`card_global_brochure_overrides:${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_global_brochure_overrides",
          filter: `card_id=eq.${cardId}`,
        },
        (payload) => {
          setHiddenIds((prev) => {
            const next = new Set(prev);
            if (payload.eventType === "INSERT") {
              next.add((payload.new as { global_brochure_image_id: string }).global_brochure_image_id);
            } else if (payload.eventType === "DELETE") {
              next.delete(
                (payload.old as { global_brochure_image_id: string }).global_brochure_image_id
              );
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

  return {
    allGlobals,
    hiddenIds,
    visibleGlobals,
    brochure,
    sections,
    loading,
    reload: load,
    setHiddenLocal,
  };
}
