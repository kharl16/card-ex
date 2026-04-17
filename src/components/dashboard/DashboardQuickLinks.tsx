import { useNavigate } from "react-router-dom";
import { Users, CalendarDays, MapPin, Gift, BarChart3, BookOpen, Wrench, UserPlus, ListTree } from "lucide-react";

const links = [
  { icon: Users, label: "Leads", path: "/dashboard/leads", color: "text-emerald-500" },
  { icon: UserPlus, label: "Prospects", path: "/prospects", color: "text-blue-500" },
  { icon: CalendarDays, label: "Appointments", path: "/dashboard/appointments", color: "text-violet-500" },
  { icon: Gift, label: "Referrals", path: "/dashboard/referrals", color: "text-amber-500" },
  { icon: MapPin, label: "Locator", path: "/locator", color: "text-rose-500" },
  { icon: BarChart3, label: "Analytics", path: "/analytics", color: "text-cyan-500" },
  { icon: BookOpen, label: "Resources", path: "/resources", color: "text-indigo-500" },
  { icon: Wrench, label: "Tools", path: "/tools", color: "text-orange-500" },
  { icon: ListTree, label: "Contents", path: "/toc", color: "text-slate-500" },
];

export function DashboardQuickLinks() {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Quick Links</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card/50 px-2 py-3 transition-all hover:bg-accent/50 hover:shadow-sm active:scale-95"
          >
            <link.icon className={`h-5 w-5 ${link.color}`} />
            <span className="text-[11px] font-medium text-foreground/80">{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
