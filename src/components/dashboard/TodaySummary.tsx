import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, QrCode, UserPlus, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface TodaySummaryProps {
  cards: Tables<"cards">[];
}

interface Summary {
  views: number;
  scans: number;
  leads: number;
  appointments: number;
}

export function TodaySummary({ cards }: TodaySummaryProps) {
  const [summary, setSummary] = useState<Summary>({ views: 0, scans: 0, leads: 0, appointments: 0 });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().slice(0, 10);
      const cardIds = cards.map((c) => c.id);

      const [analyticsRes, leadsRes, apptRes] = await Promise.all([
        cardIds.length
          ? supabase.from("analytics_daily").select("views, qr_scans").in("card_id", cardIds).eq("day", today)
          : Promise.resolve({ data: [] } as any),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("owner_user_id", user.id)
          .gte("created_at", `${today}T00:00:00`),
        supabase
          .from("card_appointments")
          .select("id", { count: "exact", head: true })
          .eq("owner_user_id", user.id)
          .gte("created_at", `${today}T00:00:00`),
      ]);

      if (cancelled) return;

      const rows = (analyticsRes.data || []) as { views: number | null; qr_scans: number | null }[];
      setSummary({
        views: rows.reduce((a, r) => a + (r.views || 0), 0),
        scans: rows.reduce((a, r) => a + (r.qr_scans || 0), 0),
        leads: leadsRes.count ?? 0,
        appointments: apptRes.count ?? 0,
      });
    };

    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cards]);

  const items = [
    { icon: Eye, label: "Profile Views", value: summary.views, tone: "text-primary" },
    { icon: QrCode, label: "QR Scans", value: summary.scans, tone: "text-emerald-400" },
    { icon: UserPlus, label: "Leads", value: summary.leads, tone: "text-blue-400" },
    { icon: CalendarDays, label: "Appointments", value: summary.appointments, tone: "text-rose-400" },
  ];

  return (
    <section aria-label="Today's summary" className="space-y-2">
      <h2 className="px-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Today's Summary
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border/40 bg-card/40 p-3 backdrop-blur-xl shadow-sm"
          >
            <div className="flex items-center gap-2">
              <item.icon className={cn("h-4 w-4", item.tone)} />
              <span className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</span>
            </div>
            <p className="mt-1 text-xl font-bold tracking-tight">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
