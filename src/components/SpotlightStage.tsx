import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightStageProps {
  activeIndex: number;
  count: number;
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

interface SpotlightContextValue {
  activeIndex: number;
  count: number;
  enabled: boolean;
}

const SpotlightContext = createContext<SpotlightContextValue>({
  activeIndex: 0,
  count: 0,
  enabled: true,
});

export function useSpotlightContext() {
  return useContext(SpotlightContext);
}

// Helper function to determine if a slide is active
export function getSlideActiveClass(
  index: number,
  activeIndex: number,
  count: number,
  enabled: boolean
): string {
  if (!enabled || count === 0) return "";
  
  // Calculate cyclic distance
  const diff = Math.abs(index - Math.round(activeIndex));
  const cyclicDist = Math.min(diff, count - diff);
  
  if (cyclicDist === 0) {
    return "cardex-slide-active";
  }
  return "cardex-slide-inactive";
}

export default function SpotlightStage({
  activeIndex,
  count,
  children,
  className,
  enabled = true,
}: SpotlightStageProps) {
  return (
    <SpotlightContext.Provider value={{ activeIndex, count, enabled }}>
      <div className={cn("relative w-full", className)}>
        {/* Spotlight Overlays - CSS-only cones */}
        {enabled && (
          <>
            {/* Left spotlight cone */}
            <div
              className="pointer-events-none absolute -top-8 -left-4 w-48 h-64 z-10 opacity-30"
              style={{
                background: `
                  radial-gradient(
                    ellipse 120% 100% at 0% 0%,
                    rgba(250, 204, 21, 0.4) 0%,
                    rgba(250, 204, 21, 0.15) 30%,
                    transparent 70%
                  )
                `,
                transform: "rotate(25deg)",
                filter: "blur(20px)",
              }}
              aria-hidden="true"
            />
            
            {/* Right spotlight cone */}
            <div
              className="pointer-events-none absolute -top-8 -right-4 w-48 h-64 z-10 opacity-30"
              style={{
                background: `
                  radial-gradient(
                    ellipse 120% 100% at 100% 0%,
                    rgba(250, 204, 21, 0.4) 0%,
                    rgba(250, 204, 21, 0.15) 30%,
                    transparent 70%
                  )
                `,
                transform: "rotate(-25deg)",
                filter: "blur(20px)",
              }}
              aria-hidden="true"
            />
            
            {/* Center subtle glow */}
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 z-10 opacity-20"
              style={{
                background: `
                  radial-gradient(
                    ellipse 100% 80% at 50% 50%,
                    rgba(250, 204, 21, 0.3) 0%,
                    transparent 60%
                  )
                `,
                filter: "blur(30px)",
              }}
              aria-hidden="true"
            />
          </>
        )}
        
        {/* Carousel content */}
        <div className="relative z-0">
          {children}
        </div>
      </div>
    </SpotlightContext.Provider>
  );
}

// CSS styles to be added to the component or global CSS
export const spotlightSlideStyles = `
  .cardex-slide-active {
    filter: brightness(1.2) saturate(1.1);
    opacity: 1;
    transition: filter 250ms ease, opacity 250ms ease, transform 250ms ease;
  }
  
  .cardex-slide-inactive {
    filter: brightness(0.85);
    opacity: 0.8;
    transition: filter 250ms ease, opacity 250ms ease, transform 250ms ease;
  }
  
  @media (prefers-reduced-motion: reduce) {
    .cardex-slide-active,
    .cardex-slide-inactive {
      transition: none;
    }
  }
`;
