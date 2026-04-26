import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type CardLite = {
  id: string;
  full_name: string | null;
  is_published: boolean | null;
};

interface SaveToCardPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cardId: string) => Promise<void> | void;
  title?: string;
  description?: string;
  saving?: boolean;
}

/**
 * Lets the user pick which of their cards to save a test result to.
 * Used by DISC and Love Languages tools when no specific cardId is in context.
 */
export default function SaveToCardPicker({
  open,
  onOpenChange,
  onConfirm,
  title = "Save to which card?",
  description = "Choose the card you want this result saved to. Each card stores its own result.",
  saving,
}: SaveToCardPickerProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cards")
        .select("id, full_name, is_published")
        .eq("user_id", user.id)
        .order("is_published", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data ?? []) as CardLite[];
      setCards(list);
      setSelectedId(list[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            You don't have any cards yet. Create a card first.
          </p>
        ) : (
          <RadioGroup
            value={selectedId ?? undefined}
            onValueChange={setSelectedId}
            className="max-h-72 overflow-y-auto space-y-2 py-1"
          >
            {cards.map((c) => (
              <Label
                key={c.id}
                htmlFor={`card-${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-accent/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <RadioGroupItem id={`card-${c.id}`} value={c.id} />
                  <span className="truncate text-sm font-medium">
                    {c.full_name?.trim() || "Untitled Card"}
                  </span>
                </div>
                <Badge variant={c.is_published ? "default" : "secondary"} className="shrink-0">
                  {c.is_published ? "Live" : "Draft"}
                </Badge>
              </Label>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId || saving || loading}
          >
            {saving ? "Saving…" : "Save to this card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
