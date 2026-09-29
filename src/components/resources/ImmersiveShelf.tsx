import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImmersiveShelfProps {
  id?: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A single "shelf" inside the Resources pavilion — fluted reeded glass
 * substrate, warm amber light sweep, floor pool underglow and precision gold
 * hairline horizons, matching ShowcaseRow on the public cards.
 */
export function ImmersiveShelf({
  id,
  icon: Icon,
  title,
  subtitle,
  count,
  viewAllHref,
  children,
  className,
}: ImmersiveShelfProps) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn(
        "group/shelf relative isolate mx-3 mb-3 overflow-hidden sm:mx-5",
        "rounded-2xl border border-white/[0.07] backdrop-blur-md",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_22px_48px_-28px_rgba(0,0,0,0.95)]",
        "px-3 py-3 sm:px-4 sm:py-4",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(14,17,25,0.92) 0%, rgba(6,8,14,0.96) 55%, rgba(4,5,10,0.98) 100%)",
      }}
    >
      {/* Fluted / reeded glass columns */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.28) 3px, rgba(255,255,255,0.045) 8px, rgba(255,255,255,0.075) 9px, rgba(255,255,255,0.035) 11px, rgba(0,0,0,0.30) 15px, rgba(0,0,0,0.55) 18px)",
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.85) 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {/* Volumetric warm amber light sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(105deg, transparent 0%, hsl(42 85% 62% / 0.05) 26%, hsl(45 90% 72% / 0.11) 42%, hsl(42 85% 62% / 0.05) 58%, transparent 82%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Ambient amber underglow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(85% 60% at 50% 100%, hsl(var(--primary) / 0.16) 0%, hsl(var(--primary) / 0.05) 45%, transparent 75%)",
        }}
      />
      {/* Gold hairline horizons */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 28%, hsl(45 80% 70% / 0.65) 50%, hsl(var(--primary) / 0.4) 72%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.28) 30%, hsl(45 80% 70% / 0.45) 50%, hsl(var(--primary) / 0.28) 70%, transparent 100%)",
        }}
      />

      <div className="relative mb-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight tracking-wide text-foreground">
              <span className="truncate">{title}</span>
              {typeof count === "number" && (
                <span className="text-sm font-normal text-muted-foreground">({count})</span>
              )}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex min-h-[44px] flex-shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Tiles hover above the glass on soft pedestal shadows */}
      <div className="relative [&_img]:bg-black/90">{children}</div>
    </section>
  );
}
