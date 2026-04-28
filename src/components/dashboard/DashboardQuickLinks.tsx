import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Users, CalendarDays, MapPin, Gift, BarChart3, BookOpen, Wrench, UserPlus, ListTree, ChevronDown, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CardOption = { id: string; full_name: string; is_published: boolean | null };

const links = [
  { icon: Users, label: "Leads", path: "/dashboard/leads", color: "text-emerald-500" },
  { icon: UserPlus, label: "Prospects", path: "/prospects", color: "text-blue-500" },
  { icon: CalendarDays, label: "Appointments", path: "/dashboard/appointments", color: "text-violet-500" },
  { icon: Gift, label: "Referrals", path: "/dashboard/referrals", color: "text-amber-500" },
  { icon: MapPin, label: "Locator", path: "/locator", color: "text-rose-500" },
  { icon: BarChart3, label: "Analytics", path: "__analytics__", color: "text-cyan-500" },
  { icon: BookOpen, label: "Resources", path: "/resources", color: "text-indigo-500" },
  { icon: Wrench, label: "Tools", path: "/tools", color: "text-orange-500" },
  { icon: ListTree, label: "Contents", path: "/toc", color: "text-slate-500" },
];

export function DashboardQuickLinks() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [cards, setCards] = useState<CardOption[]>([]);

  const visibleLinks = isAdmin
    ? [...links, { icon: ShieldAlert, label: "OTP Audit", path: "/admin/otp-audit", color: "text-red-500" }]
    : links;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("cards")
      .select("id, full_name, is_published")
      .eq("user_id", user.id)
      .order("is_published", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => setCards((data ?? []) as CardOption[]));
  }, [user]);

  const handleClick = (path: string) => {
    if (path === "__analytics__") {
      if (cards.length === 0) {
        toast.error("Create a card first to view analytics");
        return;
      }
      if (cards.length === 1) {
        navigate(`/cards/${cards[0].id}/analytics`);
      }
      // For >1 card the dropdown handles navigation
      return;
    }
    navigate(path);
  };

  const renderTile = (link: typeof links[number]) => (
    <button
      onClick={() => handleClick(link.path)}
      className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card/50 px-2 py-3 transition-all hover:bg-accent/50 hover:shadow-sm active:scale-95"
    >
      <link.icon className={`h-5 w-5 ${link.color}`} />
      <span className="flex items-center gap-0.5 text-[11px] font-medium text-foreground/80">
        {link.label}
        {link.path === "__analytics__" && cards.length > 1 && (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </span>
    </button>
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Quick Links</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
        {visibleLinks.map((link) => {
          if (link.path === "__analytics__" && cards.length > 1) {
            return (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card/50 px-2 py-3 transition-all hover:bg-accent/50 hover:shadow-sm active:scale-95"
                  >
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                    <span className="flex items-center gap-0.5 text-[11px] font-medium text-foreground/80">
                      {link.label}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuLabel>Choose a card</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {cards.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => navigate(`/cards/${c.id}/analytics`)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{c.full_name || "Untitled card"}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.is_published ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        {c.is_published ? "Live" : "Draft"}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          return <div key={link.label}>{renderTile(link)}</div>;
        })}
      </div>
    </div>
  );
}
