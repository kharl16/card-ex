import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { PIPELINE_STATUSES, INTEREST_LEVELS, type Prospect } from "@/hooks/useProspects";

interface ProspectPipelineProps {
  prospects: Prospect[];
  onOpenProspect: (prospect: Prospect) => void;
  onStatusChange: (prospectId: string, newStatus: string) => void;
}

const KANBAN_STATUSES = PIPELINE_STATUSES.filter(
  (s) => !["not_interested", "nurture"].includes(s.value)
);

const initials = (name: string) =>
  name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

export default function ProspectPipeline({ prospects, onOpenProspect, onStatusChange }: ProspectPipelineProps) {
  const columns = useMemo(() => {
    return KANBAN_STATUSES.map((status) => ({
      ...status,
      items: prospects.filter((p) => p.pipeline_status === status.value),
    }));
  }, [prospects]);

  const move = (p: Prospect, dir: -1 | 1) => {
    const idx = KANBAN_STATUSES.findIndex((s) => s.value === p.pipeline_status);
    const next = KANBAN_STATUSES[idx + dir];
    if (next) onStatusChange(p.id, next.value);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-3 min-w-max snap-x snap-mandatory">
        {columns.map((col, colIdx) => (
          <section
            key={col.value}
            className="w-[15rem] shrink-0 snap-start rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm"
          >
            {/* Column header */}
            <header className="sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-border/50 bg-card/80 px-3 py-2.5 backdrop-blur">
              <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/90">
                {col.label}
              </span>
              <Badge variant="secondary" className="ml-auto h-5 min-w-[1.5rem] justify-center px-1.5 text-[10px]">
                {col.items.length}
              </Badge>
            </header>

            {/* Column body */}
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-2">
              {col.items.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/50 px-3 py-6 text-center text-[11px] text-muted-foreground">
                  No prospects
                </p>
              )}
              {col.items.map((p) => {
                const heat = INTEREST_LEVELS.find((l) => l.value === p.interest_level);
                return (
                  <article
                    key={p.id}
                    className="group rounded-xl border border-border/50 bg-background/70 p-2.5 transition-colors hover:border-primary/40 hover:bg-background"
                  >
                    <button
                      className="flex w-full items-start gap-2 text-left"
                      onClick={() => onOpenProspect(p)}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {initials(p.full_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span className="truncate text-[13px] font-semibold leading-tight">{p.full_name}</span>
                          {heat?.emoji && <span className="shrink-0 text-[11px]">{heat.emoji}</span>}
                        </span>
                        {p.company && (
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{p.company}</span>
                        )}
                        {p.next_follow_up_at && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {new Date(p.next_follow_up_at).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </button>

                    <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/40 pt-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        disabled={colIdx === 0}
                        onClick={() => move(p, -1)}
                        aria-label="Move to previous stage"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        disabled={colIdx === KANBAN_STATUSES.length - 1}
                        onClick={() => move(p, 1)}
                        aria-label="Move to next stage"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
