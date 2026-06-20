import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { EditorSection } from "./SmartAccordion";

interface SectionNavigatorProps {
  sections: EditorSection[];
  activeId: string;
  onJump: (id: string) => void;
}

/**
 * Sticky horizontal mini-map for the card editor.
 * Lets the user jump between sections (Bio, Contact, Social, etc.)
 * while the live preview stays in sync with edits.
 */
export function SectionNavigator({ sections, activeId, onJump }: SectionNavigatorProps) {
  if (!sections.length) return null;

  return (
    <nav
      aria-label="Editor sections"
      className="sticky top-16 z-30 -mx-2 mb-3 rounded-xl border border-border/60 bg-background/85 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {sections.map((s) => {
          const isActive = s.id === activeId;
          const isDone = s.progress === 100;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onJump(s.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                "min-h-[36px] whitespace-nowrap",
                isActive
                  ? "border-[#D4AF37] bg-[#D4AF37]/15 text-foreground shadow-sm"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              {s.icon && <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{s.icon}</span>}
              <span className="truncate max-w-[140px]">{s.title}</span>
              {isDone && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
