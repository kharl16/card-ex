import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Bell, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenStats?: () => void;
}

const globalTabs = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bell, label: "Activity", path: "/dashboard/activity" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export function MobileBottomNav(_props: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-md sm:hidden">
      <div className="flex items-stretch justify-around">
        {globalTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
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
