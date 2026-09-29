import { cn } from "@/lib/utils";

interface ImmersivePavilionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The outer "Luxury Showcase Pavilion" capsule used by the public card
 * Immersive showcase, reused here so the dashboard Resources Hub shares the
 * exact same dark-luxury staging.
 */
export function ImmersivePavilion({ children, className }: ImmersivePavilionProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-card/60 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.35),inset_0_1px_0_hsl(var(--primary)/0.15)] backdrop-blur-xl",
        className
      )}
      style={{
        background: [
          "radial-gradient(90% 55% at 50% 35%, hsl(var(--primary) / 0.16) 0%, transparent 65%)",
          "radial-gradient(80% 40% at 85% 45%, hsl(var(--primary) / 0.08) 0%, transparent 65%)",
          "radial-gradient(70% 35% at 10% 80%, hsl(var(--primary) / 0.07) 0%, transparent 60%)",
          "linear-gradient(180deg, #07090f 0%, #0b0e16 45%, #060810 100%)",
        ].join(", "),
      }}
    >
      {/* Ultra-fine gold geometric mesh overlay with vignette fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(hsl(var(--primary) / 0.05) 1px, transparent 1px)",
            "linear-gradient(90deg, hsl(var(--primary) / 0.05) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(120% 100% at 50% 40%, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(120% 100% at 50% 40%, black 30%, transparent 85%)",
        }}
      />
      {/* Gold-pulse hairline divider at the top of the stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.7) 50%, transparent 100%)",
        }}
      />
      <div className="relative z-10 pb-3 pt-2">{children}</div>
    </div>
  );
}
