import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScroll({
  title,
  subtitle,
  seeAllHref,
  children,
  className,
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className={cn("relative", className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-border/50 hover:border-primary/30"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-border/50 hover:border-primary/30"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          {seeAllHref && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 ml-1" asChild>
              <Link to={seeAllHref}>
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable area with fade edges */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
