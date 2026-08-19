import { useMemo, useState } from "react";
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
  const [stageIdx, setStageIdx] = useState(0);

  const columns = useMemo(() => {
    return KANBAN_STATUSES.map((status) => ({
      ...status,
      items: prospects.filter((p) => p.pipeline_status === status.value),
    }));
  }, [prospects]);

  const col = columns[stageIdx] ?? columns[0];

  const move = (p: Prospect, dir: -1 | 1) => {
    const idx = KANBAN_STATUSES.findIndex((s) => s.value === p.pipeline_status);
    const next = KANBAN_STATUSES[idx + dir];
    if (next) onStatusChange(p.id, next.value);
  };

  return (
    <div className="space-y-3">
      {/* Stage navigator — every stage reachable, nothing hidden off-screen */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-2">
          {columns.map((c, i) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setStageIdx(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                i === stageIdx
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${c.color}`} />
              {c.label}
              <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{c.items.length}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Focused stage column — full width */}
      <section className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm">
        <header className="flex items-center gap-2 border-b border-border/50 px-2 py-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            disabled={stageIdx === 0}
            onClick={() => setStageIdx((i) => Math.max(0, i - 1))}
            aria-label="Previous stage"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${col.color}`} />
            <span className="truncate text-sm font-bold tracking-tight">{col.label}</span>
            <Badge variant="secondary" className="h-5 min-w-[1.5rem] justify-center px-1.5 text-[10px]">
              {col.items.length}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            disabled={stageIdx === columns.length - 1}
            onClick={() => setStageIdx((i) => Math.min(columns.length - 1, i + 1))}
            aria-label="Next stage"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </header>

        <div className="max-h-[62vh] space-y-2 overflow-y-auto p-2">
          {col.items.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/50 px-3 py-8 text-center text-xs text-muted-foreground">
              No prospects in {col.label}
            </p>
          )}
          {col.items.map((p) => {
            const heat = INTEREST_LEVELS.find((l) => l.value === p.interest_level);
            return (
              <article
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 p-2.5 transition-colors hover:border-primary/40 hover:bg-background"
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  onClick={() => onOpenProspect(p)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {initials(p.full_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-sm font-semibold leading-tight">{p.full_name}</span>
                      {heat?.emoji && <span className="shrink-0 text-[11px]">{heat.emoji}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {p.company && <span className="truncate">{p.company}</span>}
                      {p.next_follow_up_at && (
                        <span className="flex shrink-0 items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(p.next_follow_up_at).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled={stageIdx === 0}
                    onClick={() => move(p, -1)}
                    aria-label="Move to previous stage"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled={stageIdx === KANBAN_STATUSES.length - 1}
                    onClick={() => move(p, 1)}
                    aria-label="Move to next stage"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
