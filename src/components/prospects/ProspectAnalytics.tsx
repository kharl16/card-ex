import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PIPELINE_STATUSES, type Prospect } from "@/hooks/useProspects";

interface ProspectAnalyticsProps {
  prospects: Prospect[];
}

export default function ProspectAnalytics({ prospects }: ProspectAnalyticsProps) {
  const analytics = useMemo(() => {
    const total = prospects.length;
    const converted = prospects.filter((p) => p.pipeline_status === "converted").length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    const withFollowups = prospects.filter((p) => p.next_follow_up_at);
    const completedFollowups = prospects.filter((p) => p.pipeline_status === "converted" || p.last_contacted_at);
    const followupRate = withFollowups.length > 0
      ? Math.round((completedFollowups.length / withFollowups.length) * 100)
      : 0;

    const byStatus = PIPELINE_STATUSES.map((s) => ({
      ...s,
      count: prospects.filter((p) => p.pipeline_status === s.value).length,
    }));

    return { total, converted, conversionRate, followupRate, byStatus };
  }, [prospects]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold">{analytics.total}</p>
            <p className="text-xs text-muted-foreground">Total Prospects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{analytics.converted}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{analytics.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{analytics.followupRate}%</p>
            <p className="text-xs text-muted-foreground">Follow-Up Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics.byStatus.filter((s) => s.count > 0).map((s) => (
            <div key={s.value} className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${s.color} shrink-0`} />
              <span className="text-sm flex-1">{s.label}</span>
              <span className="text-sm font-semibold">{s.count}</span>
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${s.color} rounded-full transition-all`}
                  style={{ width: `${analytics.total > 0 ? (s.count / analytics.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
