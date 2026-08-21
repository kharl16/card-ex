import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { businessBibleVerses } from "@/data/bibleVerses";
import { dailyQuotes } from "@/data/dailyQuotes";
import {
  useBibleWisdom,
  getCurrentSlot,
  getSlotIndex,
  getZonedDayOfYear,
} from "@/hooks/useBibleWisdom";

interface Quote {
  text: string;
  author: string;
  source_url: string | null;
}

const getSlot = getCurrentSlot;
const slotIndex = (_slot: unknown, d: Date = new Date()) => getSlotIndex(d);
const dayOfYear = getZonedDayOfYear;

const FALLBACK: Quote = {
  text: "The secret of getting ahead is getting started.",
  author: "Mark Twain",
  source_url: null,
};

interface CardDailyQuoteProps {
  accentColor?: string;
}

/**
 * Compact, card-tuned variant of the dashboard MotivationalQuote.
 * Swipeable: slide 1 = daily quote, slide 2 = business Bible verse.
 * Rotates 3x per day (morning/afternoon/evening) across a 1,095-item pool.
 */
export default function CardDailyQuote({ accentColor }: CardDailyQuoteProps) {
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

  // Admin-curated quotes first, built-in library fills up to 1,095.
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
    const idx = (dayOfYear(now) * 3 + slotIndex(null, now)) % quotePool.length;
    return quotePool[idx];
  }, [now, quotePool]);

  const verse = useMemo(() => {
    const idx =
      (dayOfYear(now) * 3 + slotIndex(null, now)) % businessBibleVerses.length;
    return businessBibleVerses[idx];
  }, [now]);

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

  const accent = accentColor || "hsl(var(--primary))";

  return (
    <div className="px-6 pt-3 pb-1">
      <div
        className="relative overflow-hidden rounded-2xl glass-shimmer animate-slide-up-fade"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          border: "1px solid var(--glass-border)",
          borderTop: "1px solid var(--glass-border-highlight)",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-roledescription="carousel"
      >
        <div
          className="absolute left-0 top-0 z-10 h-full w-[3px]"
          style={{ background: accent, opacity: 0.7 }}
        />

        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {/* Slide 1 — Daily quote */}
          <div className="w-full shrink-0 px-4 py-3">
            <div className="flex items-start gap-2.5 pl-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm italic leading-relaxed text-foreground/90">
                  "{quote.text}"
                </p>
                <p className="mt-1 text-xs font-medium" style={{ color: accent, opacity: 0.85 }}>
                  — {quote.author}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Daily inspiration · Card-Ex
                </p>
              </div>
            </div>
          </div>

          {/* Slide 2 — Bible verse for business */}
          <div className="w-full shrink-0 px-4 py-3">
            <div className="flex items-start gap-2.5 pl-2">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm italic leading-relaxed text-foreground/90">
                  "{verse.text}"
                </p>
                <p className="mt-1 text-xs font-medium" style={{ color: accent, opacity: 0.85 }}>
                  — {verse.reference}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Bible verse for business · Card-Ex
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
              className="h-2.5 w-2.5 rounded-full transition-opacity"
              style={{ background: accent, opacity: slide === i ? 1 : 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
