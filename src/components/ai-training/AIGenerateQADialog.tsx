import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface AIGenerateQADialogProps {
  cardId: string;
  onImported: () => void;
  existingCount: number;
}

interface GeneratedPair {
  question: string;
  answer: string;
  selected: boolean;
}

export function AIGenerateQADialog({ cardId, onImported, existingCount }: AIGenerateQADialogProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pairs, setPairs] = useState<GeneratedPair[]>([]);

  const generate = async () => {
    setGenerating(true);
    setPairs([]);

    try {
      const resp = await supabase.functions.invoke("generate-qa-suggestions", {
        body: { cardId },
      });

      if (resp.error) throw resp.error;

      const suggestions: { question: string; answer: string }[] = resp.data?.suggestions || [];
      if (suggestions.length === 0) {
        toast.error("No suggestions generated. Make sure your card has enough data (bio, products, etc.).");
        setGenerating(false);
        return;
      }

      setPairs(suggestions.map(s => ({ ...s, selected: true })));
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate suggestions");
    }
    setGenerating(false);
  };

  const togglePair = (idx: number) => {
    setPairs(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const selectedCount = pairs.filter(p => p.selected).length;

  const handleSave = async () => {
    const toSave = pairs.filter(p => p.selected);
    if (toSave.length === 0) return;
    setSaving(true);

    const rows = toSave.map((p, i) => ({
      question: p.question,
      answer: p.answer,
      card_id: cardId,
      sort_order: existingCount + i,
    }));

    const { error } = await supabase.from("ai_training_qa").insert(rows);

    if (error) {
      toast.error("Failed to save suggestions");
      console.error(error);
    } else {
      toast.success(`${toSave.length} Q&A pairs added`);
      setOpen(false);
      setPairs([]);
      onImported();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPairs([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Generated Q&A Suggestions
          </DialogTitle>
          <DialogDescription>
            Generate Q&A pairs automatically from your card's data. Review and select which ones to keep.
          </DialogDescription>
        </DialogHeader>

        {pairs.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <Sparkles className="h-10 w-10 mx-auto text-primary opacity-60" />
            <p className="text-sm text-muted-foreground">
              AI will analyze your card's bio, products, contact info, and links to generate relevant Q&A pairs.
            </p>
            <Button onClick={generate} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Click to select/deselect. {selectedCount} of {pairs.length} selected.
            </p>
            {pairs.map((pair, idx) => (
              <button
                key={idx}
                onClick={() => togglePair(idx)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  pair.selected ? "border-primary bg-primary/5" : "border-border opacity-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {pair.selected ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Q: {pair.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">A: {pair.answer}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {pairs.length > 0 && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={generate} disabled={generating} size="sm">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Regenerate"}
            </Button>
            <Button onClick={handleSave} disabled={saving || selectedCount === 0} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Add {selectedCount} pairs
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
