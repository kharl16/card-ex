import { useNavigate } from "react-router-dom";
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
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all active:scale-95 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-4 sm:py-2 ${
            (action as any).primary
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border/50 bg-card/50 text-foreground hover:bg-accent"
          }`}
        >
          <action.icon className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="text-xs font-medium leading-tight">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
