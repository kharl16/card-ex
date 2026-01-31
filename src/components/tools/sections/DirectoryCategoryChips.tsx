import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DirectoryCategoryChip = {
  id: string;
  label: string;
  count: number;
  icon?: ReactNode;
};

type Props = {
  categories: readonly DirectoryCategoryChip[];
  activeId: string;
  onChange: (id: string) => void;
};

export default function DirectoryCategoryChips({ categories, activeId, onChange }: Props) {
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Fixed 2-column, 3-row layout for all screen sizes */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {categories.map((cat) => {
          const active = activeId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={cn(
                // Base styles - increased height for senior-friendly touch targets
                "w-full h-12 rounded-xl px-4 min-w-0",
                "flex items-center justify-between gap-3",
                "border-2 bg-background/60 backdrop-blur-sm",
                "text-base font-semibold transition-all duration-200",
                // Active state - prominent highlight
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "text-foreground border-border/50 hover:border-primary/60 hover:bg-muted/50",
              )}
            >
              {/* Icon + Label - no truncation for full readability */}
              <span className="flex items-center gap-2.5 min-w-0">
                {cat.icon && (
                  <span className={cn(
                    "shrink-0 w-5 h-5",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {cat.icon}
                  </span>
                )}
                <span className="text-left leading-tight">{cat.label}</span>
              </span>

              {/* Count badge - always visible */}
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
