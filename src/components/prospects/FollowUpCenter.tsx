import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { format, isToday, isPast, isTomorrow, addDays, isWithinInterval } from "date-fns";
import type { Prospect } from "@/hooks/useProspects";

interface FollowUpCenterProps {
  prospects: Prospect[];
  onOpenProspect: (prospect: Prospect) => void;
}

export default function FollowUpCenter({ prospects, onOpenProspect }: FollowUpCenterProps) {
  const { overdue, today, upcoming } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const weekEnd = addDays(todayStart, 7);

    const withFollowups = prospects.filter((p) => p.next_follow_up_at);

    return {
      overdue: withFollowups.filter((p) => {
        const d = new Date(p.next_follow_up_at!);
        return isPast(d) && !isToday(d);
      }),
      today: withFollowups.filter((p) => isToday(new Date(p.next_follow_up_at!))),
      upcoming: withFollowups.filter((p) => {
        const d = new Date(p.next_follow_up_at!);
        return d >= todayEnd && d <= weekEnd;
      }),
    };
  }, [prospects]);

  const renderSection = (title: string, items: Prospect[], icon: React.ReactNode, emptyText: string) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">{icon} {title} ({items.length})</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">{emptyText}</p>
      ) : (
        items.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onOpenProspect(p)}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{p.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(p.next_follow_up_at!), "MMM d, h:mm a")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {renderSection("Overdue", overdue, <AlertTriangle className="h-4 w-4 text-red-500" />, "No overdue follow-ups 🎉")}
      {renderSection("Due Today", today, <Clock className="h-4 w-4 text-orange-500" />, "Nothing due today")}
      {renderSection("Upcoming", upcoming, <CheckCircle2 className="h-4 w-4 text-blue-500" />, "No upcoming follow-ups")}
    </div>
  );
}
