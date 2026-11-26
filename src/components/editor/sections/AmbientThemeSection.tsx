import { Check, Layers3, Monitor, Sparkles } from "lucide-react";
import AmbientThemeBackground from "@/components/ambient/AmbientThemeBackground";
import {
  AMBIENT_THEMES,
  getCardAmbientTheme,
  isDashboardThemeSynced,
  withAmbientTheme,
} from "@/lib/ambientThemes";
import type { CardTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface AmbientThemeSectionProps {
  theme: CardTheme;
  onChange: (theme: CardTheme) => void;
}

export default function AmbientThemeSection({ theme, onChange }: AmbientThemeSectionProps) {
  const selectedTheme = getCardAmbientTheme(theme);
  const dashboardSynced = isDashboardThemeSynced(theme);

  return (
    <section aria-labelledby="ambient-theme-heading" className="space-y-4 border-t border-border/50 pt-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Layers3 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id="ambient-theme-heading" className="text-base font-semibold text-foreground">3D Ambience &amp; Theme</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Add depth and gentle movement behind your card. The Card Preview updates instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3" data-ambient-theme-options>
        {AMBIENT_THEMES.map((option) => {
          const selected = selectedTheme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              data-ambient-theme-option={option.id}
              onClick={() => onChange(withAmbientTheme(theme, option.id))}
              className={cn(
                "group min-h-[212px] w-full overflow-hidden rounded-2xl border bg-card/50 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[184px] [--ambient-choice-art-height:136px] sm:[--ambient-choice-art-height:96px]",
                selected ? "border-primary/70 bg-primary/10" : "border-border/60 hover:border-primary/40",
              )}
            >
              <div className="ambient-theme-choice-art" data-ambient-theme={option.id}>
                <AmbientThemeBackground theme={option.id} contained staticPreview />
                <span className="ambient-choice-mock" aria-hidden="true">
                  <span className="ambient-choice-mock-line ambient-choice-mock-line--wide" />
                  <span className="ambient-choice-mock-line" />
                  <span className="ambient-choice-mock-button" />
                </span>
                {selected && (
                  <span className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold sm:h-7 sm:w-7">
                    <Check className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Selected</span>
                  </span>
                )}
              </div>
              <span className="block p-4 sm:p-3.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-foreground sm:text-sm">
                  {option.name}
                  {selected && <Sparkles className="h-4 w-4 shrink-0 text-primary sm:h-3.5 sm:w-3.5" aria-hidden />}
                  {selected && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      In use
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground sm:text-xs">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={dashboardSynced}
        data-dashboard-theme-sync
        onClick={() => onChange(withAmbientTheme(theme, selectedTheme, !dashboardSynced))}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-left transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-12"
      >
        <span className="flex min-w-0 items-start gap-3">
          <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold text-foreground">Use this theme on my Dashboard</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Your most recently edited synced card sets the dashboard ambience.
            </span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
            dashboardSynced ? "border-primary bg-primary" : "border-border bg-input",
          )}
        >
          <span
            className={cn(
              "absolute left-1 top-1 h-[18px] w-[18px] rounded-full bg-background shadow-sm transition-transform",
              dashboardSynced && "translate-x-5",
            )}
          />
        </span>
      </button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Devices set to Reduce Motion automatically receive a beautiful static version.
      </p>
    </section>
  );
}
