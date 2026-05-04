import { useState } from "react";
import { Users, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMyReferrals } from "@/hooks/useReferral";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  qualified: "bg-green-500/15 text-green-500 border-green-500/30",
  paid_out: "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

export function ReferralsFeed() {
  const { data: referrals = [], isLoading } = useMyReferrals();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-xl border border-border/50 bg-card/50 p-4 ${
        expanded ? "fixed inset-4 z-50 overflow-hidden bg-card shadow-2xl" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" />
          Your Referrals
          {referrals.length > 0 && (
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
              {referrals.length}
            </Badge>
          )}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Minimize" : "Maximize"}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted/20" />
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No referrals yet</p>
          <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => navigate("/dashboard/referrals")}>
            Start referring →
          </Button>
        </div>
      ) : (
        <ScrollArea className={expanded ? "h-[calc(100%-3rem)]" : "h-[220px]"}>
          <div className="space-y-2 pr-3">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 p-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(ref.referred_profile?.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {ref.referred_profile?.full_name || "Unnamed user"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {ref.plan?.name ? `${ref.plan.name} · ` : ""}
                    {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColor[ref.status] || ""}`}>
                  {ref.status.replace("_", " ")}
                </Badge>
                {ref.referred_card?.slug && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => window.open(`/c/${ref.referred_card!.slug}`, "_blank")}
                    aria-label="Open card"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
