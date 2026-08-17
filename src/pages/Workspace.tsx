import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, CalendarDays, Images, BarChart3, Wrench, BookOpen, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedStatsCards } from "@/components/dashboard/AnimatedStatsCards";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { DashboardDock } from "@/components/dashboard/DashboardDock";
import { useDashboardTileStats } from "@/hooks/useDashboardTileStats";
import type { Tables } from "@/integrations/supabase/types";

export default function Workspace() {
  const navigate = useNavigate();
  const stats = useDashboardTileStats();
  const [cards, setCards] = useState<Tables<"cards">[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("cards").select("*").eq("user_id", user.id);
      setCards(data || []);
    })();
  }, []);

  const modules = [
    {
      label: "Leads",
      description: stats.loading ? "Your captured contacts" : `${stats.leads} total leads`,
      icon: Users,
      path: "/dashboard/leads",
      tone: "text-blue-400 bg-blue-500/10",
    },
    {
      label: "Appointments",
      description: stats.loading ? "Bookings from your card" : `${stats.appointments} booked`,
      icon: CalendarDays,
      path: "/dashboard/appointments",
      tone: "text-rose-400 bg-rose-500/10",
    },
    {
      label: "Gallery",
      description: stats.loading ? "Your card media" : `${stats.gallery} items`,
      icon: Images,
      path: "/gallery",
      tone: "text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Tools",
      description: "Your business toolkit",
      icon: Wrench,
      path: "/tools",
      tone: "text-amber-400 bg-amber-500/10",
    },
    {
      label: "Bible Wisdom",
      description: "365 days · 3 readings a day",
      icon: BookOpen,
      path: "/dashboard/bible-wisdom",
      tone: "text-violet-400 bg-violet-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw] pb-24 sm:pb-8">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Workspace</h1>
        </div>
      </header>

      <DashboardDock />

      <main className="container mx-auto space-y-6 px-4 py-5">
        <p className="text-sm text-muted-foreground">
          Everything you need to run your business — leads, bookings, media, statistics and tools.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => navigate(m.path)}
              className="group flex min-h-[88px] items-center gap-3 rounded-3xl border border-border/40 bg-card/40 p-4 text-left backdrop-blur-xl shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/60 active:scale-[0.99]"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${m.tone}`}>
                <m.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight">{m.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{m.description}</span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 px-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            <BarChart3 className="h-3.5 w-3.5" />
            Statistics
          </h2>
          <AnimatedStatsCards cards={cards} />
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
}
