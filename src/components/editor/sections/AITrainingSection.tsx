import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Brain } from "lucide-react";
import { BulkImportDialog } from "@/components/ai-training/BulkImportDialog";
import { TemplateQADialog } from "@/components/ai-training/TemplateQADialog";
import { AIGenerateQADialog } from "@/components/ai-training/AIGenerateQADialog";

interface QAItem {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

interface AITrainingSectionProps {
  cardId: string;
}

export function AITrainingSection({ cardId }: AITrainingSectionProps) {
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  useEffect(() => {
    fetchCardQA();
  }, [cardId]);

  const fetchCardQA = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_training_qa")
      .select("id, question, answer, is_active, sort_order")
      .eq("card_id", cardId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setQaItems((data as QAItem[]) || []);
    }
    setLoading(false);
  };

  const addQA = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Both question and answer are required");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("ai_training_qa")
      .insert({
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        card_id: cardId,
        sort_order: qaItems.length,
      })
      .select("id, question, answer, is_active, sort_order")
      .single();

    if (error) {
      toast.error("Failed to add Q&A");
    } else {
      setQaItems([...qaItems, data as QAItem]);
      setNewQuestion("");
      setNewAnswer("");
      toast.success("Q&A added");
    }
    setSaving(false);
  };

  const updateQA = async (id: string, updates: Partial<QAItem>) => {
    const { error } = await supabase
      .from("ai_training_qa")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
    } else {
      setQaItems(qaItems.map((q) => (q.id === id ? { ...q, ...updates } : q)));
    }
  };

  const deleteQA = async (id: string) => {
    const { error } = await supabase
      .from("ai_training_qa")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      setQaItems(qaItems.filter((q) => q.id !== id));
      toast.success("Q&A removed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Q&A...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Add custom Q&A pairs to train your card's AI chatbot. These supplement
        the global knowledge base set by the admin.
      </p>

      {/* Existing items */}
      {qaItems.map((item) => (
        <div
          key={item.id}
          className={`border rounded-lg p-3 space-y-2 ${!item.is_active ? "opacity-50" : ""}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Input
                value={item.question}
                placeholder="Question"
                className="text-sm"
                onChange={(e) =>
                  setQaItems(
                    qaItems.map((q) =>
                      q.id === item.id ? { ...q, question: e.target.value } : q
                    )
                  )
                }
                onBlur={() => updateQA(item.id, { question: item.question })}
              />
              <Textarea
                value={item.answer}
                placeholder="Answer"
                className="text-sm"
                rows={2}
                onChange={(e) =>
                  setQaItems(
                    qaItems.map((q) =>
                      q.id === item.id ? { ...q, answer: e.target.value } : q
                    )
                  )
                }
                onBlur={() => updateQA(item.id, { answer: item.answer })}
              />
            </div>
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <Switch
                checked={item.is_active}
                onCheckedChange={(checked) => updateQA(item.id, { is_active: checked })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteQA(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Add new */}
      <div className="border border-dashed rounded-lg p-3 space-y-2">
        <Input
          placeholder='e.g. "What are your business hours?"'
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="text-sm"
        />
        <Textarea
          placeholder="The answer..."
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button size="sm" onClick={addQA} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add Q&A
        </Button>
      </div>

      {qaItems.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No custom Q&A yet. The chatbot uses your card data and global Q&A.
        </p>
      )}
    </div>
  );
}
