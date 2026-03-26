import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PIPELINE_STATUSES, INTEREST_LEVELS, type Prospect } from "@/hooks/useProspects";

interface ProspectPipelineProps {
  prospects: Prospect[];
  onOpenProspect: (prospect: Prospect) => void;
  onStatusChange: (prospectId: string, newStatus: string) => void;
}

const KANBAN_STATUSES = PIPELINE_STATUSES.filter(
  (s) => !["not_interested", "reconnect_later"].includes(s.value)
);

export default function ProspectPipeline({ prospects, onOpenProspect, onStatusChange }: ProspectPipelineProps) {
  const columns = useMemo(() => {
    return KANBAN_STATUSES.map((status) => ({
      ...status,
      items: prospects.filter((p) => p.pipeline_status === status.value),
    }));
  }, [prospects]);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-max">
        {columns.map((col) => (
          <div key={col.value} className="w-56 shrink-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`h-3 w-3 rounded-full ${col.color}`} />
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{col.items.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
              {col.items.map((p) => {
                const heat = INTEREST_LEVELS.find((l) => l.value === p.interest_level);
                return (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onOpenProspect(p)}
                  >
                    <CardContent className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate flex-1">{p.full_name}</p>
                        <span className="text-xs">{heat?.emoji}</span>
                      </div>
                      {p.company && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{p.company}</p>
                      )}
                      {p.notes && (
                        <p className="text-[10px] text-muted-foreground truncate mt-1">{p.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
