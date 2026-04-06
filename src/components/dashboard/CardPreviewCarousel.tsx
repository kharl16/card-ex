import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface CardPreviewCarouselProps {
  cards: CardData[];
}

export function CardPreviewCarousel({ cards }: CardPreviewCarouselProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (cards.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 220;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Your Cards</h3>
        {cards.length > 2 && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scroll("left")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scroll("right")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {cards.map((card, idx) => {
          const theme = card.theme as any;
          const primaryColor = theme?.primary || "#D4AF37";
          const bgColor = theme?.background || "#0B0B0C";
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={card.id}
              className="group relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border/30 transition-all duration-300"
              style={{
                width: 190,
                height: 240,
                scrollSnapAlign: "start",
                transform: isHovered ? "scale(1.04)" : "scale(1)",
                boxShadow: isHovered ? `0 8px 32px ${primaryColor}30` : "none",
              }}
              onClick={() => navigate(`/cards/${card.id}/edit`)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Background gradient */}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(160deg, ${bgColor}, ${primaryColor}15, ${bgColor})` }}
              />

              {/* Glow effect on hover */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300"
                style={{
                  opacity: isHovered ? 1 : 0,
                  background: `radial-gradient(circle at 50% 30%, ${primaryColor}20, transparent 70%)`,
                }}
              />

              {/* Content */}
              <div className="relative flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                {/* Avatar */}
                {card.avatar_url ? (
                  <div className="relative">
                    <div
                      className="absolute -inset-1 rounded-full opacity-50 blur-md"
                      style={{ background: primaryColor }}
                    />
                    <img
                      src={card.avatar_url}
                      alt={card.full_name}
                      className="relative h-16 w-16 rounded-full border-2 object-cover"
                      style={{ borderColor: `${primaryColor}60` }}
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)`,
                      color: bgColor,
                    }}
                  >
                    {(card.full_name || "U")[0].toUpperCase()}
                  </div>
                )}

                {/* Logo */}
                {card.logo_url && (
                  <img
                    src={card.logo_url}
                    alt="Logo"
                    className="h-6 w-auto object-contain opacity-60"
                  />
                )}

                {/* Name */}
                <div className="w-full">
                  <p
                    className="truncate text-sm font-bold"
                    style={{ color: primaryColor }}
                  >
                    {card.full_name}
                  </p>
                  <p className="truncate text-xs text-foreground/50">
                    {card.title || card.company || ""}
                  </p>
                </div>

                {/* Status pill */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    card.is_published
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {card.is_published ? "Live" : "Draft"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
