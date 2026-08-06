import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ExternalLink, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { businessBibleVerses } from "@/data/bibleVerses";
import { dailyQuotes } from "@/data/dailyQuotes";


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

  // Pool of exactly 1,095 quotes = 3 per day for a full year.
  // Admin-curated DB quotes come first, then the built-in library fills the rest.
  const quotePool = useMemo<Quote[]>(() => {
    const seen = new Set<string>();
    const pool: Quote[] = [];
    for (const q of quotes) {
      const k = q.text.trim().toLowerCase();
      if (seen.has(k) || pool.length >= 1095) continue;
      seen.add(k);
      pool.push(q);
    }
    for (const q of dailyQuotes) {
      const k = q.text.trim().toLowerCase();
      if (seen.has(k) || pool.length >= 1095) continue;
      seen.add(k);
      pool.push({ text: q.text, author: q.author, source_url: q.source_url ?? null });
    }
    return pool;
  }, [quotes]);

  const quote = useMemo<Quote>(() => {
    if (quotePool.length === 0) return FALLBACK;
    const idx = (dayOfYear(now) * 3 + slotIndex(getSlot(now))) % quotePool.length;
    return quotePool[idx];
  }, [now, quotePool]);

  const verse = useMemo(() => {
    const idx =
      (dayOfYear(now) * 3 + slotIndex(getSlot(now))) % businessBibleVerses.length;
    return businessBibleVerses[idx];
  }, [now]);

  // 0 = daily quote, 1 = bible verse
  const [slide, setSlide] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    setSlide((s) => (dx < 0 ? Math.min(1, s + 1) : Math.max(0, s - 1)));
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      {/* Gold accent line */}
      <div className="absolute left-0 top-0 z-10 h-full w-1 bg-gradient-to-b from-primary via-primary/60 to-primary" />

      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${slide * 100}%)` }}
      >
        {/* Slide 1 — Daily quote */}
        <div className="w-full shrink-0 px-5 py-4">
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

        {/* Slide 2 — Bible verse for business */}
        <div className="w-full shrink-0 px-5 py-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium italic leading-relaxed text-foreground/90">
                "{verse.text}"
              </p>
              <p className="mt-1.5 text-xs font-semibold text-primary/70">
                — {verse.reference}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 pb-2">
        {["Daily quote", "Bible verse for business"].map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setSlide(i)}
            aria-label={label}
            aria-current={slide === i}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              slide === i ? "bg-primary" : "bg-primary/25 hover:bg-primary/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

