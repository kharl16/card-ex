import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onNewCard: () => void;
  onQuickShare?: () => void;
  hasCards: boolean;
}

export function QuickActions({ onNewCard }: QuickActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onNewCard}
        className="h-12 flex-1 gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 sm:flex-none sm:px-8"
      >
        <Plus className="h-5 w-5" />
        Create Template
      </Button>
    </div>
  );
}
