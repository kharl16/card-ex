import * as React from "react";
import { cn } from "@/lib/utils";

interface TopRightActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Reserve horizontal space for an external close (X) button rendered by a
   * parent Dialog/Sheet so action icons (favorite, share, etc.) never overlap it.
   */
  reserveCloseSlot?: boolean;
  /** Tailwind gap between actions. */
  gap?: string;
  /** Distance from the top edge (Tailwind class). */
  top?: string;
  /** Distance from the right edge when no close slot is reserved (Tailwind class). */
  right?: string;
}

/**
 * Top-right floating action container.
 *
 * Use inside any image/lightbox/dialog surface to host icon buttons
 * (favorite, share, download, etc.). Set `reserveCloseSlot` when the
 * surrounding Dialog already renders its own X close button — the
 * container will shift left so the icons never overlap the X.
 */
export function TopRightActions({
  reserveCloseSlot = false,
  gap = "gap-2",
  top = "top-3",
  right,
  className,
  children,
  ...props
}: TopRightActionsProps) {
  const rightClass = right ?? (reserveCloseSlot ? "right-14" : "right-3");
  return (
    <div
      className={cn(
        "absolute z-20 flex items-center",
        top,
        rightClass,
        gap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
