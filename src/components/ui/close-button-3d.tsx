import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CloseButton3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Screen-reader label. Default: "Close". */
  label?: string;
}

/**
 * The one standard close (X) button used by every window, viewer and panel:
 * a 44px obsidian circle with a gold ring and gold X that presses down when
 * tapped. It has no size or colour variants so every close button looks and
 * behaves the same.
 *
 * The visible circle is an inner element, so a caller can pass transparent
 * padding through `className` (e.g. `p-1.5 -m-1.5` on phones) to grow the
 * tappable area without changing the 44px circle or its position.
 */
export const CloseButton3D = React.forwardRef<HTMLButtonElement, CloseButton3DProps>(
  ({ className, label = "Close", ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      data-close-button
      className={cn(
        "group inline-flex shrink-0 items-center justify-center rounded-full",
        "m-0 p-0",
        "transition-all duration-150 ease-out",
        "hover:-translate-y-0.5",
        "active:translate-y-[3px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        data-close-circle
        aria-hidden="true"
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          "border border-primary/60 bg-gradient-to-b from-card to-background text-primary",
          "shadow-[0_4px_0_0_hsl(var(--primary)/0.35),0_6px_14px_hsl(var(--background)/0.6)]",
          "transition-all duration-150 ease-out",
          "group-hover:border-primary group-hover:shadow-[0_5px_0_0_hsl(var(--primary)/0.45),0_10px_20px_hsl(var(--background)/0.7)]",
          "group-active:shadow-[0_1px_0_0_hsl(var(--primary)/0.3),0_2px_6px_hsl(var(--background)/0.5)]",
        )}
      >
        <X className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      </span>
      <span className="sr-only">{label}</span>
    </button>
  ),
);
CloseButton3D.displayName = CloseButton3D.displayName;
