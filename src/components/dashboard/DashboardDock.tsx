import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, PlayCircle, BookOpen, Wrench, Users, CalendarDays, BarChart3, Shield, ShieldAlert, CreditCard, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const mainTabs = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: MapPin, label: "Locator", path: "/locator" },
  { icon: PlayCircle, label: "Videos", path: "/dashboard/videos" },
  { icon: BookOpen, label: "Resources", path: "/resources" },
];

const moreTabs = [
  { icon: Wrench, label: "Tools", path: "/tools" },
  { icon: Users, label: "Leads", path: "/dashboard/leads" },
  { icon: CalendarDays, label: "Appointments", path: "/dashboard/appointments" },
  { icon: BarChart3, label: "Gallery", path: "/gallery" },
];

const adminTabs = [
  { icon: Shield, label: "Admin Cards", path: "/admin/cards" },
  { icon: CreditCard, label: "Admin Referrals", path: "/admin/referrals" },
  { icon: FileText, label: "Admin Templates", path: "/admin/templates" },
  { icon: ShieldAlert, label: "OTP Audit", path: "/admin/otp-audit" },
];

export function DashboardDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { isAdmin } = useAuth();


  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="hidden sm:flex sticky top-14 z-30 border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 h-12">
          {mainTabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(tab.path)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <tab.icon className={cn("h-4 w-4", isActive(tab.path) && "text-primary")} />
              <span>{tab.label}</span>
            </button>
          ))}

          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <span>More</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-48 p-2">
              {moreTabs.map((m) => (
                <button
                  key={m.path}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(m.path)
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-accent"
                  )}
                  onClick={() => { setMoreOpen(false); navigate(m.path); }}
                >
                  <m.icon className={cn("h-4 w-4", isActive(m.path) ? "text-primary" : "text-muted-foreground")} />
                  {m.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {isAdmin && (
            <Popover open={adminOpen} onOpenChange={setAdminOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-56 p-2">
                {adminTabs.map((a) => (
                  <button
                    key={a.path}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(a.path)
                        ? "text-primary bg-primary/10"
                        : "text-foreground hover:bg-accent"
                    )}
                    onClick={() => { setAdminOpen(false); navigate(a.path); }}
                  >
                    <a.icon className={cn("h-4 w-4", isActive(a.path) ? "text-primary" : "text-amber-500")} />
                    {a.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>

      </div>
    </nav>
  );
}
