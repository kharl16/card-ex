import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageSquare, StickyNote, Calendar, ChevronRight } from "lucide-react";
import { PIPELINE_STATUSES, INTEREST_LEVELS, type Prospect } from "@/hooks/useProspects";
import { format, isToday, isPast, isTomorrow } from "date-fns";

interface ProspectCardProps {
  prospect: Prospect;
  onOpen: (prospect: Prospect) => void;
  onQuickAction?: (prospect: Prospect, action: string) => void;
}

export default function ProspectCard({ prospect, onOpen, onQuickAction }: ProspectCardProps) {
  const status = PIPELINE_STATUSES.find((s) => s.value === prospect.pipeline_status);
  const heat = INTEREST_LEVELS.find((l) => l.value === prospect.interest_level);

  const getFollowUpBadge = () => {
    if (!prospect.next_follow_up_at) return null;
    const d = new Date(prospect.next_follow_up_at);
    if (isPast(d) && !isToday(d)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (isToday(d)) {
      return <Badge className="text-xs bg-orange-500 hover:bg-orange-600">Due Today</Badge>;
    }
    if (isTomorrow(d)) {
      return <Badge variant="secondary" className="text-xs">Tomorrow</Badge>;
    }
    return null;
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99] border-border/50"
      onClick={() => onOpen(prospect)}
    >
      <CardContent className="flex items-center gap-3 py-3.5 px-4">
        {/* Avatar */}
        <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {prospect.full_name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{prospect.full_name}</p>
            <span className="text-xs">{heat?.emoji}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
              <div className={`h-1.5 w-1.5 rounded-full ${status?.color || "bg-muted"}`} />
              {status?.label || prospect.pipeline_status}
            </Badge>
            {getFollowUpBadge()}
          </div>
          {prospect.notes && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {prospect.notes}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0">
          {prospect.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${prospect.phone}`, "_self");
              }}
            >
              <Phone className="h-4 w-4 text-emerald-500" />
            </Button>
          )}
          {(prospect.messenger_link || prospect.whatsapp) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                const link = prospect.messenger_link || `https://wa.me/${prospect.whatsapp?.replace(/\D/g, "")}`;
                window.open(link, "_blank");
              }}
            >
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
