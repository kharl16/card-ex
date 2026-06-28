import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  MapPin,
  PlayCircle,
  FolderOpen,
  Link as LinkIcon,
  BookOpen,
  Users,
  Image as ImageIcon,
  Wrench,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { cn } from "@/lib/utils";

type Section = "Locator" | "Videos" | "Resources" | "Gallery" | "Tools";

interface Hit {
  id: string;
  section: Section;
  title: string;
  subtitle?: string;
  route: string;
}

const SECTION_META: Record<Section, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  Locator: { icon: MapPin, color: "text-emerald-400" },
  Videos: { icon: PlayCircle, color: "text-rose-400" },
  Resources: { icon: FolderOpen, color: "text-amber-400" },
  Gallery: { icon: ImageIcon, color: "text-sky-400" },
  Tools: { icon: Wrench, color: "text-violet-400" },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const like = `%${debounced}%`;
    const co = activeCompanyId;

    const run = async () => {
      const queries: Promise<Hit[]>[] = [];

      // Locator (directory_entries)
      queries.push(
        (async () => {
          let q = supabase
            .from("directory_entries")
            .select("id, location, owner, address")
            .or(
              `location.ilike.${like},owner.ilike.${like},address.ilike.${like}`
            )
            .eq("is_active", true)
            .limit(6);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `loc-${r.id}`,
            section: "Locator",
            title: r.location || r.owner || "Distributor",
            subtitle: r.address || r.owner || undefined,
            route: "/locator",
          }));
        })()
      );

      // Videos (training_items)
      queries.push(
        (async () => {
          let q = supabase
            .from("training_items")
            .select("id, title, description, category")
            .or(
              `title.ilike.${like},description.ilike.${like},category.ilike.${like}`
            )
            .eq("is_active", true)
            .limit(6);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `vid-${r.id}`,
            section: "Videos",
            title: r.title,
            subtitle: r.category || r.description || undefined,
            route: "/dashboard/videos",
          }));
        })()
      );

      // Resources — files_repository
      queries.push(
        (async () => {
          let q = supabase
            .from("files_repository")
            .select("id, file_name, folder_name, description")
            .or(
              `file_name.ilike.${like},folder_name.ilike.${like},description.ilike.${like}`
            )
            .eq("is_active", true)
            .limit(6);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `file-${r.id}`,
            section: "Resources",
            title: r.file_name,
            subtitle: r.folder_name || undefined,
            route: "/resources/files",
          }));
        })()
      );

      // Resources — iam_links
      queries.push(
        (async () => {
          let q = supabase
            .from("iam_links")
            .select("id, name, link")
            .or(`name.ilike.${like},link.ilike.${like}`)
            .eq("is_active", true)
            .limit(4);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `link-${r.id}`,
            section: "Resources",
            title: r.name,
            subtitle: r.link,
            route: "/resources/links",
          }));
        })()
      );

      // Resources — ambassadors_library
      queries.push(
        (async () => {
          let q = supabase
            .from("ambassadors_library")
            .select("id, endorser, product_endorsed, folder_name")
            .or(
              `endorser.ilike.${like},product_endorsed.ilike.${like},folder_name.ilike.${like}`
            )
            .eq("is_active", true)
            .limit(4);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `amb-${r.id}`,
            section: "Resources",
            title: r.endorser || r.product_endorsed || "Ambassador",
            subtitle: r.product_endorsed || r.folder_name || undefined,
            route: "/resources/ambassadors",
          }));
        })()
      );

      // Resources — ways_13
      queries.push(
        (async () => {
          let q = supabase
            .from("ways_13")
            .select("id, content")
            .ilike("content", like)
            .eq("is_active", true)
            .limit(4);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `way-${r.id}`,
            section: "Resources",
            title: (r.content || "").slice(0, 60),
            subtitle: "13 Ways",
            route: "/resources/13-ways",
          }));
        })()
      );

      // Tools
      queries.push(
        (async () => {
          let q = supabase
            .from("tools")
            .select("id, title, description, category")
            .or(
              `title.ilike.${like},description.ilike.${like},category.ilike.${like}`
            )
            .eq("is_active", true)
            .limit(6);
          if (co) q = q.eq("company_id", co);
          const { data } = await q;
          return (data ?? []).map((r): Hit => ({
            id: `tool-${r.id}`,
            section: "Tools",
            title: r.title,
            subtitle: r.category || r.description || undefined,
            route: "/tools",
          }));
        })()
      );

      // Gallery (card_images) — limited to current user's cards
      queries.push(
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return [];
          const { data: cards } = await supabase
            .from("cards")
            .select("id, full_name, title")
            .eq("user_id", user.id);
          const ids = (cards ?? []).map((c) => c.id);
          if (!ids.length) return [];
          const { data } = await supabase
            .from("card_images")
            .select("id, url, card_id")
            .in("card_id", ids)
            .ilike("url", like)
            .limit(4);
          const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
          return (data ?? []).map((r): Hit => {
            const c = cardById.get(r.card_id);
            return {
              id: `img-${r.id}`,
              section: "Gallery",
              title: c?.full_name || c?.title || "Gallery image",
              subtitle: r.url,
              route: "/gallery",
            };
          });
        })()
      );

      const results = (await Promise.all(queries)).flat();
      if (!cancelled) {
        setHits(results);
        setLoading(false);
      }
    };

    run().catch(() => {
      if (!cancelled) {
        setHits([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debounced, activeCompanyId]);

  const grouped = useMemo(() => {
    const m = new Map<Section, Hit[]>();
    for (const h of hits) {
      const arr = m.get(h.section) ?? [];
      arr.push(h);
      m.set(h.section, arr);
    }
    return Array.from(m.entries());
  }, [hits]);

  const go = (h: Hit) => {
    setOpen(false);
    setQuery("");
    navigate(`${h.route}?q=${encodeURIComponent(debounced)}`);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search Locator, Videos, Resources, Gallery, Tools…"
          className="pl-9 pr-9 h-11 rounded-full bg-background/60 border-border/60 backdrop-blur"
          aria-label="Global search"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setHits([]);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && debounced.length >= 2 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-popover/95 shadow-2xl backdrop-blur-xl">
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && hits.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No results for “{debounced}”
              </div>
            )}
            {!loading &&
              grouped.map(([section, items]) => {
                const Meta = SECTION_META[section];
                const Icon = Meta.icon;
                return (
                  <div key={section} className="border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                      <Icon className={cn("h-3.5 w-3.5", Meta.color)} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {section}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">
                        {items.length}
                      </span>
                    </div>
                    <ul className="pb-2">
                      {items.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => go(h)}
                            className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                          >
                            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", Meta.color)} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">
                                {h.title}
                              </div>
                              {h.subtitle && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {h.subtitle}
                                </div>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
