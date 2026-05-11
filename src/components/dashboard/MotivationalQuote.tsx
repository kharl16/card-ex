import { useEffect, useMemo, useState } from "react";
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
  // Expanded library
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "George Lorimer" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Sometimes later becomes never. Do it now.", author: "Unknown" },
  { text: "Little by little, a little becomes a lot.", author: "Tanzanian Proverb" },
  { text: "If opportunity doesn't knock, build a door.", author: "Milton Berle" },
  { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
];

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

function pickQuote(now: Date) {
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const idx = (dayOfYear * 3 + slotIndex(getSlot(now))) % quotes.length;
  return quotes[idx];
}

export function MotivationalQuote() {
  const [now, setNow] = useState(() => new Date());

  // Re-pick when the slot changes (poll every minute; cheap and reliable across tab sleeps)
  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow((prev) => (getSlot(prev) === getSlot(next) ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const quote = useMemo(() => pickQuote(now), [now]);

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
