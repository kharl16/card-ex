import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, Shield, CreditCard, Gift, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { DashboardDock } from "@/components/dashboard/DashboardDock";
import { supabase } from "@/integrations/supabase/client";
import { OAuthProviderStatus } from "@/components/settings/OAuthProviderStatus";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { label: "Security & devices", description: "Trusted devices, PIN and privacy", icon: Shield, path: "/security" },
  { label: "Billing & plan", description: "Manage your subscription", icon: CreditCard, path: "/billing" },
  { label: "Referrals", description: "Track invites and earnings", icon: Gift, path: "/dashboard/referrals" },
];

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw] pb-24 sm:pb-8">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <DashboardDock />

      <main className="container mx-auto max-w-xl space-y-3 px-4 py-5">
        {links.map((l) => (
          <button
            key={l.path}
            type="button"
            onClick={() => navigate(l.path)}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-left backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-card/60 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <l.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{l.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{l.description}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        ))}

        {isAdmin && <OAuthProviderStatus isAdmin={isAdmin} />}


        <Button variant="outline" className="h-12 w-full text-base" onClick={signOut}>
          <LogOut className="mr-2 h-5 w-5" />
          Sign out
        </Button>
      </main>

      <MobileBottomNav />
    </div>
  );
}
