import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Users, CalendarDays, Wrench } from "lucide-react";

interface QuickActionsProps {
  onNewCard: () => void;
}

export function QuickActions({ onNewCard }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    { icon: Plus, label: "New Card", onClick: onNewCard, primary: true },
    { icon: BarChart3, label: "Analytics", onClick: () => navigate("/analytics") },
    { icon: Users, label: "Leads", onClick: () => navigate("/dashboard/leads") },
    { icon: CalendarDays, label: "Appointments", onClick: () => navigate("/dashboard/appointments") },
    { icon: Wrench, label: "Tools", onClick: () => navigate("/tools") },
  ];

  return (
    <div className="flex flex-wrap gap-2 overflow-hidden">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.primary ? "default" : "outline"}
          size="sm"
          className={`gap-2 ${action.primary ? "" : "border-border/50 bg-card/50 hover:bg-accent"}`}
          onClick={action.onClick}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
