import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Bell, User, Settings, Shield, CreditCard, FileText, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardDockProps {
  onOpenStats?: () => void;
}

const globalTabs = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bell, label: "Activity", path: "/dashboard/activity" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const adminTabs = [
  { icon: Shield, label: "Admin Cards", path: "/admin/cards" },
  { icon: CreditCard, label: "Admin Referrals", path: "/admin/referrals" },
  { icon: FileText, label: "Admin Templates", path: "/admin/templates" },
  { icon: ShieldAlert, label: "OTP Audit", path: "/admin/otp-audit" },
];

export function DashboardDock(_props: DashboardDockProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="hidden sm:flex sticky top-14 z-30 border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 h-12">
          {globalTabs.map((tab) => (
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
                      isActive(a.path) ? "text-primary bg-primary/10" : "text-foreground hover:bg-accent"
                    )}
                    onClick={() => {
                      setAdminOpen(false);
                      navigate(a.path);
                    }}
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
