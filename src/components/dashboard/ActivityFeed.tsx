import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, UserPlus, CalendarDays, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "view" | "lead" | "appointment";
  title: string;
  subtitle: string;
  time: string;
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch recent leads + appointments in parallel
    const [leadsRes, appointmentsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, source, created_at")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("card_appointments")
        .select("id, visitor_name, appointment_date, created_at, card_id")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const feed: ActivityItem[] = [];

    (leadsRes.data || []).forEach((l) =>
      feed.push({
        id: l.id,
        type: "lead",
        title: `New lead: ${l.name}`,
        subtitle: `Source: ${l.source}`,
        time: l.created_at,
      })
    );

    (appointmentsRes.data || []).forEach((a) =>
      feed.push({
        id: a.id,
        type: "appointment",
        title: `Appointment with ${a.visitor_name}`,
        subtitle: a.appointment_date,
        time: a.created_at,
      })
    );

    feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setItems(feed.slice(0, 8));
    setLoading(false);
  };

  const iconMap = {
    view: Eye,
    lead: UserPlus,
    appointment: CalendarDays,
  };

  const colorMap = {
    view: "text-primary",
    lead: "text-emerald-400",
    appointment: "text-blue-400",
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted/20" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted/20" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-muted/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Recent Activity</h3>
        <div className="flex flex-col items-center py-6 text-center">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No recent activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Recent Activity</h3>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = iconMap[item.type];
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent ${colorMap[item.type]}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
