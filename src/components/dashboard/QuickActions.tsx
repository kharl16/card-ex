import { Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onNewCard: () => void;
  onQuickShare?: () => void;
  hasCards: boolean;
}

export function QuickActions({ onNewCard, onQuickShare, hasCards }: QuickActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onNewCard}
        className="h-12 flex-1 gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 sm:flex-none sm:px-8"
      >
        <Plus className="h-5 w-5" />
        New Card
      </Button>
      {hasCards && onQuickShare && (
        <Button
          onClick={onQuickShare}
          variant="outline"
          className="h-12 flex-1 gap-2 rounded-xl border-primary/30 text-base font-semibold transition-all hover:border-primary/50 hover:bg-primary/5 sm:flex-none sm:px-8"
        >
          <Share2 className="h-5 w-5" />
          Quick Share
        </Button>
      )}
    </div>
  );
}
