import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { DashboardDock } from "@/components/dashboard/DashboardDock";

export default function DashboardActivity() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw] pb-24 sm:pb-8">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Activity</h1>
        </div>
      </header>

      <DashboardDock />

      <main className="container mx-auto space-y-4 px-4 py-5">
        <p className="text-sm text-muted-foreground">
          Recent leads, bookings and updates across your Card-Ex account.
        </p>
        <ActivityFeed />
      </main>

      <MobileBottomNav />
    </div>
  );
}
