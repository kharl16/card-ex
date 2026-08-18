import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, HelpCircle, Snowflake, Phone, MessageSquare, Mail, ChevronRight } from "lucide-react";
import { INTEREST_LEVELS, type Prospect } from "@/hooks/useProspects";

type FocusKey = "overdue" | "dueToday" | "noNextStep" | "stale";

interface Props {
  lists: Record<FocusKey, Prospect[]>;
  focus: FocusKey;
  onFocusChange: (f: FocusKey) => void;
  onOpenProspect: (p: Prospect) => void;
}

const TABS: { key: FocusKey; label: string; icon: typeof Clock; color: string }[] = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-500" },
  { key: "dueToday", label: "Today", icon: Clock, color: "text-orange-500" },
  { key: "noNextStep", label: "No Next Step", icon: HelpCircle, color: "text-yellow-500" },
  { key: "stale", label: "Going Cold", icon: Snowflake, color: "text-sky-400" },
];

export default function ProspectActionCenter({ lists, focus, onFocusChange, onOpenProspect }: Props) {
  const [limit, setLimit] = useState(10);
  const items = lists[focus] || [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={focus === t.key ? "default" : "outline"}
            size="sm"
            className="h-14 flex-col gap-1 text-[10px] px-1"
            onClick={() => { onFocusChange(t.key); setLimit(10); }}
          >
            <t.icon className={`h-4 w-4 ${focus === t.key ? "" : t.color}`} />
            <span className="leading-tight text-center">{t.label} ({(lists[t.key] || []).length})</span>
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-6 text-center">
            <p className="text-sm font-semibold">All clear here 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">Nothing needs your attention in this list.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.slice(0, limit).map((p) => {
            const heat = INTEREST_LEVELS.find((l) => l.value === p.interest_level);
            return (
              <Card key={p.id} className="border-border/50">
                <CardContent className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <button className="min-w-0 flex-1 text-left" onClick={() => onOpenProspect(p)}>
                      <p className="text-sm font-semibold truncate">
                        {p.full_name} <span className="text-xs">{heat?.emoji}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.next_follow_up_at
                          ? `Follow-up: ${new Date(p.next_follow_up_at).toLocaleString()}`
                          : p.last_contacted_at
                            ? `Last contacted: ${new Date(p.last_contacted_at).toLocaleDateString()}`
                            : "Never contacted"}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.phone && (
                        <Button asChild size="icon" variant="ghost" className="h-9 w-9" aria-label="Call">
                          <a href={`tel:${p.phone}`}><Phone className="h-4 w-4 text-emerald-500" /></a>
                        </Button>
                      )}
                      {p.messenger_link && (
                        <Button asChild size="icon" variant="ghost" className="h-9 w-9" aria-label="Message">
                          <a href={p.messenger_link} target="_blank" rel="noreferrer"><MessageSquare className="h-4 w-4 text-blue-500" /></a>
                        </Button>
                      )}
                      {p.email && (
                        <Button asChild size="icon" variant="ghost" className="h-9 w-9" aria-label="Email">
                          <a href={`mailto:${p.email}`}><Mail className="h-4 w-4 text-sky-400" /></a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onOpenProspect(p)} aria-label="Open prospect">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length > limit && (
            <Button variant="outline" className="w-full h-11" onClick={() => setLimit((l) => l + 10)}>
              Show more <Badge variant="secondary" className="ml-2">{items.length - limit}</Badge>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
