import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CloseButton3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight: subtle (dark) or prominent (gold). Default: subtle. */
  variant?: "subtle" | "prominent";
  /** Icon size in Tailwind scale. Default: "h-5 w-5". */
  iconSize?: string;
  /** Screen-reader label. Default: "Close". */
  label?: string;
}

/**
 * A highly visible, tactile 3-D close button.
 * Uses a raised shadow block that presses down on active state to simulate depth.
 */
export const CloseButton3D = React.forwardRef<HTMLButtonElement, CloseButton3DProps>(
  ({ className, variant = "subtle", iconSize = "h-5 w-5", label = "Close", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-full transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      subtle: [
        "h-10 w-10",
        "bg-gradient-to-b from-card to-background",
        "text-primary",
        "border border-primary/60",
        "shadow-[0_4px_0_0_hsl(var(--primary)/0.35),0_6px_14px_rgba(0,0,0,0.45)]",
        "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_hsl(var(--primary)/0.45),0_10px_20px_rgba(0,0,0,0.55)]",
        "active:translate-y-[3px] active:shadow-[0_1px_0_0_hsl(var(--primary)/0.3),0_2px_6px_rgba(0,0,0,0.4)]",
      ],
      prominent: [
        "h-11 w-11",
        "bg-gradient-to-b from-primary to-primary-hover",
        "text-primary-foreground",
        "border border-primary-subtle/60",
        "shadow-[0_4px_0_0_hsl(var(--primary-hover)/0.8),0_6px_14px_rgba(0,0,0,0.45)]",
        "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_hsl(var(--primary-hover)/0.9),0_10px_20px_rgba(0,0,0,0.55)]",
        "active:translate-y-[3px] active:shadow-[0_1px_0_0_hsl(var(--primary-hover)/0.7),0_2px_6px_rgba(0,0,0,0.4)]",
      ],
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(base, variants[variant], className)}
        {...props}
      >
        <X className={cn(iconSize, "shrink-0")} strokeWidth={2.5} />
        <span className="sr-only">{label}</span>
      </button>
    );
  }
);
CloseButton3D.displayName = "CloseButton3D";
