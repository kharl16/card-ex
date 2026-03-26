import { Card, CardContent } from "@/components/ui/card";
import { Users, Flame, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface DashboardProps {
  stats: {
    total: number;
    hot: number;
    converted: number;
    dueToday: number;
    overdue: number;
  };
}

export default function ProspectDashboard({ stats }: DashboardProps) {
  const items = [
    { label: "Total", value: stats.total, icon: Users, iconColor: "text-primary" },
    { label: "Due Today", value: stats.dueToday, icon: Clock, iconColor: "text-orange-500" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, iconColor: "text-red-500" },
    { label: "Hot Leads", value: stats.hot, icon: Flame, iconColor: "text-red-500" },
    { label: "Converted", value: stats.converted, icon: CheckCircle2, iconColor: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {items.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-3 px-2">
            <item.icon className={`h-5 w-5 ${item.iconColor} mb-1`} />
            <p className="text-xl font-bold">{item.value}</p>
            <p className="text-[10px] text-muted-foreground text-center leading-tight">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
