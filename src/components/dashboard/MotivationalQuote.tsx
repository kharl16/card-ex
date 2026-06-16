import { useEffect, useMemo, useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";

interface Quote {
  text: string;
  author: string;
  source_url: string | null;
}

type Slot = "morning" | "afternoon" | "evening";

function getSlot(d: Date): Slot {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function slotIndex(slot: Slot): number {
  return slot === "morning" ? 0 : slot === "afternoon" ? 1 : 2;
}

function dayOfYear(now: Date): number {
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
}

// Fallback in case DB is unreachable — keeps the dashboard from looking broken.
const FALLBACK: Quote = {
  text: "The secret of getting ahead is getting started.",
  author: "Mark Twain",
  source_url: "https://en.wikiquote.org/wiki/Mark_Twain",
};

export function MotivationalQuote() {
  const { activeCompanyId } = useActiveCompany();
  const [now, setNow] = useState(() => new Date());
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow((prev) => (getSlot(prev) === getSlot(next) ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("daily_quotes")
        .select("text, author, source_url")
        .eq("is_active", true)
        .eq("company_id", activeCompanyId)
        .order("sort_index", { ascending: true });
      if (!cancelled && !error && data && data.length > 0) {
        setQuotes(data as Quote[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const quote = useMemo<Quote>(() => {
    if (quotes.length === 0) return FALLBACK;
    const idx = (dayOfYear(now) * 3 + slotIndex(getSlot(now))) % quotes.length;
    return quotes[idx];
  }, [now, quotes]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-5 py-4">
      {/* Gold accent line */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary via-primary/60 to-primary" />

      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium italic leading-relaxed text-foreground/90">
            "{quote.text}"
          </p>
          <p className="mt-1.5 text-xs font-semibold text-primary/70">
            — {quote.author}
            {quote.source_url && (
              <>
                {" "}
                <a
                  href={quote.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline text-primary/80 hover:text-primary"
                  aria-label={`Source for quote by ${quote.author}`}
                >
                  source
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
