import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
 * Renders inside CardView between the header and the bio.
 * Always shows a tiny "via Card-Ex" label so visitors don't attribute the
 * quote to the card owner.
 */
export default function CardDailyQuote({ accentColor }: CardDailyQuoteProps) {
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
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("daily_quotes")
        .select("text, author, source_url")
        .eq("is_active", true)
        .order("sort_index", { ascending: true });
      if (!cancelled && !error && data && data.length > 0) {
        setQuotes(data as Quote[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const quote = useMemo<Quote>(() => {
    if (quotes.length === 0) return FALLBACK;
    const idx = (dayOfYear(now) * 3 + slotIndex(getSlot(now))) % quotes.length;
    return quotes[idx];
  }, [now, quotes]);

  const accent = accentColor || "hsl(var(--primary))";

  return (
    <div className="px-6 pt-3 pb-1">
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-3 glass-shimmer animate-slide-up-fade"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          border: "1px solid var(--glass-border)",
          borderTop: "1px solid var(--glass-border-highlight)",
        }}
      >
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: accent, opacity: 0.7 }}
        />
        <div className="flex items-start gap-2.5 pl-2">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: accent }}
          />
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
    </div>
  );
}
