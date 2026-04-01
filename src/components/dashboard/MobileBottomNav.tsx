import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, CreditCard, Users, Wrench, MoreHorizontal, BookOpen, CalendarDays, MapPin, BarChart3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const mainTabs = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Users, label: "Leads", path: "/dashboard/leads" },
  { icon: CalendarDays, label: "Appts", path: "/dashboard/appointments" },
  { icon: BookOpen, label: "Resources", path: "/resources" },
  { icon: MoreHorizontal, label: "More", path: "__more__" },
];

const moreTabs = [
  { icon: Wrench, label: "Tools", path: "/tools" },
  { icon: MapPin, label: "Locator", path: "/locator" },
  { icon: BarChart3, label: "Gallery", path: "/gallery" },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-md sm:hidden">
      <div className="flex items-stretch justify-around">
        {mainTabs.map((tab) => {
          const isMore = tab.path === "__more__";
          const isActive = !isMore && location.pathname === tab.path;

          if (isMore) {
            return (
              <Popover key="more" open={moreOpen} onOpenChange={setMoreOpen}>
                <PopoverTrigger asChild>
                  <button className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors active:bg-accent/50">
                    <tab.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-44 p-2">
                  {moreTabs.map((m) => (
                    <button
                      key={m.path}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      onClick={() => { setMoreOpen(false); navigate(m.path); }}
                    >
                      <m.icon className="h-4 w-4 text-muted-foreground" />
                      {m.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:bg-accent/50",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for phones with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
