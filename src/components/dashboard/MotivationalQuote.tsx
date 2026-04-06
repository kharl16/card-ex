import { useMemo } from "react";
import { Sparkles } from "lucide-react";

const quotes = [
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Your network is your net worth.", author: "Porter Gale" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
];

export function MotivationalQuote() {
  const quote = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return quotes[dayOfYear % quotes.length];
  }, []);

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
          </p>
        </div>
      </div>
    </div>
  );
}
