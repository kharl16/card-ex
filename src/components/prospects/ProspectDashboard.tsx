import { Card, CardContent } from "@/components/ui/card";
import { Users, Flame, CheckCircle2, Clock, AlertTriangle, Target, HelpCircle, Snowflake } from "lucide-react";

interface DashboardProps {
  stats: {
    total: number;
    hot: number;
    converted: number;
    dueToday: number;
    overdue: number;
    noNextStep?: number;
    stale?: number;
    conversionRate?: number;
  };
  onSelectFocus?: (focus: "dueToday" | "overdue" | "noNextStep" | "stale") => void;
}

export default function ProspectDashboard({ stats, onSelectFocus }: DashboardProps) {
  const items = [
    { label: "Total", value: stats.total, icon: Users, iconColor: "text-primary" },
    { label: "Due Today", value: stats.dueToday, icon: Clock, iconColor: "text-orange-500", focus: "dueToday" as const },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, iconColor: "text-red-500", focus: "overdue" as const },
    { label: "Hot Leads", value: stats.hot, icon: Flame, iconColor: "text-red-500" },
    { label: "Won", value: stats.converted, icon: CheckCircle2, iconColor: "text-emerald-500" },
    { label: "No Next Step", value: stats.noNextStep ?? 0, icon: HelpCircle, iconColor: "text-yellow-500", focus: "noNextStep" as const },
    { label: "Going Cold", value: stats.stale ?? 0, icon: Snowflake, iconColor: "text-sky-400", focus: "stale" as const },
    { label: "Close Rate", value: `${stats.conversionRate ?? 0}%`, icon: Target, iconColor: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <Card
          key={item.label}
          className={`border-border/50 ${item.focus && onSelectFocus ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
          onClick={() => item.focus && onSelectFocus?.(item.focus)}
        >
          <CardContent className="flex flex-col items-center justify-center py-3 px-1">
            <item.icon className={`h-5 w-5 ${item.iconColor} mb-1`} />
            <p className="text-lg font-bold leading-none">{item.value}</p>
            <p className="text-[10px] text-muted-foreground text-center leading-tight mt-1">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
