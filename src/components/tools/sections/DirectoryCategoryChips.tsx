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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
        {categories.map((cat) => {
          const active = activeId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={cn(
                "w-full h-11 rounded-full px-3 min-w-0",
                "flex items-center justify-between gap-2",
                "border bg-background/40 backdrop-blur",
                "text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-foreground border-border/60 hover:border-primary/50",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                {cat.icon ? <span className="shrink-0">{cat.icon}</span> : null}
                <span className="truncate">{cat.label}</span>
              </span>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
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
