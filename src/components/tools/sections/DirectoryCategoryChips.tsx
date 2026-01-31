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
    <div className="w-full overflow-hidden box-border">
      {/* Fixed 2-column, 3-row layout for all screen sizes */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => {
          const active = activeId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={cn(
                // Base styles - increased height for senior-friendly touch targets
                "h-12 rounded-xl px-3 box-border",
                "flex items-center justify-between gap-2",
                "border-2 bg-background/60 backdrop-blur-sm",
                "text-sm font-semibold transition-all duration-200",
                // Active state - prominent highlight
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "text-foreground border-border/50 hover:border-primary/60 hover:bg-muted/50",
              )}
            >
              {/* Icon + Label */}
              <span className="flex items-center gap-2 min-w-0 overflow-hidden">
                {cat.icon && (
                  <span className={cn(
                    "shrink-0 w-4 h-4",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {cat.icon}
                  </span>
                )}
                <span className="text-left leading-tight truncate">{cat.label}</span>
              </span>

              {/* Count badge - always visible */}
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
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
