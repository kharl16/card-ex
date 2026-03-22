import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  CalendarDays,
  MapPin,
  BookOpen,
} from "lucide-react";

interface QuickActionsProps {
  onNewCard: () => void;
  firstCardId?: string | null;
}

export function QuickActions({ onNewCard, firstCardId }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    { icon: Plus, label: "New Card", onClick: onNewCard, primary: true },
    { icon: Users, label: "Leads", onClick: () => navigate("/dashboard/leads") },
    { icon: CalendarDays, label: "Appointments", onClick: () => navigate("/dashboard/appointments") },
    { icon: MapPin, label: "Locator", onClick: () => navigate("/locator") },
    { icon: BookOpen, label: "Resources", onClick: () => navigate("/resources") },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 overflow-hidden">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={(action as any).primary ? "default" : "outline"}
          size="sm"
          className={`gap-1.5 text-xs ${(action as any).primary ? "" : "border-border/50 bg-card/50 hover:bg-accent"}`}
          onClick={action.onClick}
          disabled={(action as any).disabled}
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
