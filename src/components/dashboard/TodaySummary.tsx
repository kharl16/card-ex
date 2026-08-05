import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, QrCode, UserPlus, CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
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

  const totalActivity = items.reduce((a, item) => a + item.value, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-12 justify-between rounded-2xl border border-border/50 bg-card/50 px-4 text-left backdrop-blur-xl shadow-sm transition-all hover:bg-card/70 hover:border-primary/30",
            open && "border-primary/40 bg-card/70"
          )}
          aria-label="Open today's summary"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Today's Summary
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {totalActivity.toLocaleString()}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-[calc(100vw-2rem)] max-w-md border-border/50 bg-card/95 p-3 backdrop-blur-xl shadow-xl"
      >
        <div className="mb-2 flex items-center justify-between px-0.5">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Today
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/40 bg-background/60 p-3 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <item.icon className={cn("h-4 w-4", item.tone)} />
                <span className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</span>
              </div>
              <p className="mt-1 text-xl font-bold tracking-tight">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
