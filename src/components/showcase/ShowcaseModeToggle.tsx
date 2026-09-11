import React from "react";
import { LayoutGrid, GalleryHorizontalEnd, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShowcaseDisplayMode } from "@/lib/showcase";

interface ShowcaseModeToggleProps {
  value: ShowcaseDisplayMode;
  onChange: (mode: ShowcaseDisplayMode) => void;
  className?: string;
}

const OPTIONS: {
  value: ShowcaseDisplayMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "carousel",
    label: "Classic Carousel",
    description: "Your current Card-Ex showcase experience.",
    icon: <GalleryHorizontalEnd className="h-5 w-5" aria-hidden="true" />,
  },
  {
    value: "immersive",
    label: "Immersive",
    description: "A premium, cinematic browsing experience.",
    icon: <LayoutGrid className="h-5 w-5" aria-hidden="true" />,
  },
];

/**
 * Segmented control for the per-card showcase presentation style.
 * Purely presentational — the parent persists the value on the card row.
 */
export default function ShowcaseModeToggle({ value, onChange, className }: ShowcaseModeToggleProps) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-sm font-semibold tracking-wide uppercase text-foreground">
        Showcase Style
      </legend>
      <p className="text-xs text-muted-foreground">
        Choose how Company Brochure, Videos, Products, Packages and Testimonies appear on your
        public card. Your content stays exactly the same in both styles.
      </p>

      <div role="radiogroup" aria-label="Showcase style" className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "group relative flex min-h-[92px] flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
                  : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className={cn(selected ? "text-primary" : "text-muted-foreground")}>
                  {option.icon}
                </span>
                <span className="text-sm font-semibold">{option.label}</span>
                {selected && (
                  <Check className="ml-auto h-4 w-4 text-primary" aria-hidden="true" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
