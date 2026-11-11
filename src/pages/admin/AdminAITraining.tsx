import { useState, useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Brain,
  MessageSquare,
  Save,
  Loader2,
} from "lucide-react";
import { BulkImportDialog } from "@/components/ai-training/BulkImportDialog";
import { TemplateQADialog } from "@/components/ai-training/TemplateQADialog";
import { PhotoKnowledgeExtractor } from "@/components/ai-training/PhotoKnowledgeExtractor";
import { QASourceDialog } from "@/components/ai-training/QASourceDialog";
import { AttachSourceDialog } from "@/components/ai-training/AttachSourceDialog";
import { QAHistoryDialog } from "@/components/ai-training/QAHistoryDialog";
import { Badge } from "@/components/ui/badge";
import {
  filterRepository,
  findUnverifiedNumbers,
  hasPhotoSource as hasSource,
  isOnHold,
  sourceCheckText,
  type RepositoryFilter,
  type SourcePatch,
} from "@/lib/photoKnowledge";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type QAItem = Tables<"ai_training_qa">;

export default function AdminAITraining() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [filter, setFilter] = useState<RepositoryFilter>("all");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdmin) fetchGlobalQA();
  }, [isAdmin]);

  const fetchGlobalQA = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_training_qa")
      .select("*")
      .is("card_id", null)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Failed to load Q&A items");
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
        card_id: null,
        sort_order: qaItems.length,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add Q&A");
      console.error(error);
    } else {
      setQaItems([...qaItems, data as QAItem]);
      setNewQuestion("");
      setNewAnswer("");
      toast.success("Q&A added");
    }
    setSaving(false);
  };

  const updateQA = async (id: string, updates: Partial<QAItem>): Promise<boolean> => {
    const current = qaItems.find((q) => q.id === id);
    const payload: Partial<QAItem> = { ...updates };
    // Photo-sourced answers are re-checked against their photo text whenever the answer changes.
    if (current && hasSource(current) && typeof updates.answer === "string") {
      payload.unverified_numbers = findUnverifiedNumbers(
        updates.answer,
        sourceCheckText({
          extractedText: current.source_extracted_text,
          srp: current.source_srp,
          caption: current.source_caption,
        }),
      );
    }

    const { data, error } = await supabase
      .from("ai_training_qa")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      toast.error("Failed to update");
      console.error(error);
      return false;
    }
    setQaItems((prev) => prev.map((q) => (q.id === id ? data : q)));
    if (current && !isOnHold(current) && isOnHold(data)) {
      toast.warning("This answer has numbers not found on its photo — it's on hold until you confirm them.");
    }
    return true;
  };

  const confirmNumbers = async (id: string) => {
    const ok = await updateQA(id, { numbers_confirmed_at: new Date().toISOString(), is_active: true });
    if (ok) toast.success("Numbers confirmed — chatbots can use this answer now");
    return ok;
  };

  const attachSource = async (id: string, patch: SourcePatch) => {
    const ok = await updateQA(id, patch);
    if (ok && !isOnHold(patch)) toast.success("Source photo attached");
    return ok;
  };

  const heldCount = qaItems.filter(isOnHold).length;
  const unsourcedCount = qaItems.filter((q) => !hasSource(q)).length;
  const visibleItems = filterRepository(qaItems, filter);

  const showFilter = (next: RepositoryFilter) => {
    setFilter(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const FILTERS: { key: RepositoryFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: qaItems.length },
    { key: "held", label: "On hold", count: heldCount },
    { key: "unsourced", label: "No source photo", count: unsourcedCount },
  ];

  const deleteQA = async (id: string) => {
    const { error } = await supabase
      .from("ai_training_qa")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete");
      console.error(error);
    } else {
      setQaItems(qaItems.filter((q) => q.id !== id));
      toast.success("Q&A deleted");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin/cards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Chat Training</h1>
                <p className="text-sm text-muted-foreground">
                  Manage global Q&A knowledge for all card chatbots
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Info card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Global Q&A</strong> entries are included in every card's AI chatbot context.
              Card owners can also add <strong>per-card Q&A</strong> from their card editor to
              supplement or override these global entries.
            </p>
          </CardContent>
        </Card>

        {heldCount > 0 && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm">
                <strong>{heldCount}</strong> {heldCount === 1 ? "answer is" : "answers are"} waiting for you to
                confirm {heldCount === 1 ? "its" : "their"} numbers.
              </p>
              <Button variant="destructive" className="min-h-11" onClick={() => showFilter("held")}>
                Review on hold
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <BulkImportDialog cardId={null} onImported={fetchGlobalQA} existingCount={qaItems.length} />
          <TemplateQADialog cardId={null} onImported={fetchGlobalQA} existingCount={qaItems.length} />
        </div>

        <PhotoKnowledgeExtractor
          existingQuestions={qaItems.map((q) => q.question)}
          existingCount={qaItems.length}
          onSaved={fetchGlobalQA}
        />

        {/* Add new Q&A */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Q&A
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="new-question" className="text-sm">Question</Label>
              <Input
                id="new-question"
                placeholder='e.g. "What products do you sell?"'
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-answer" className="text-sm">Answer</Label>
              <Textarea
                id="new-answer"
                placeholder="The answer the AI should give..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={addQA} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Q&A
            </Button>
          </CardContent>
        </Card>

        {/* Existing Q&A list */}
        <div ref={listRef} className="space-y-3 scroll-mt-24">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Global Q&A Entries ({qaItems.length})
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show answers">
            {FILTERS.map(({ key, label, count }) => (
              <Button
                key={key}
                type="button"
                variant={filter === key ? (key === "held" ? "destructive" : "default") : "outline"}
                className="min-h-11 gap-2"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="text-xs opacity-80">{count}</span>
              </Button>
            ))}
          </div>
          {heldCount > 0 && (
            <p className="text-sm text-destructive">
              {heldCount} {heldCount === 1 ? "answer is" : "answers are"} on hold — chatbots won't use{" "}
              {heldCount === 1 ? "it" : "them"} until you review and confirm the numbers.
            </p>
          )}

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : qaItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No global Q&A entries yet.</p>
                <p className="text-sm">Add entries above to train the AI chatbot.</p>
              </CardContent>
            </Card>
          ) : visibleItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>
                  {filter === "held"
                    ? "Nothing is on hold — every answer with numbers has been confirmed."
                    : "Every answer has a source photo attached."}
                </p>
                <Button variant="outline" className="mt-3 min-h-11" onClick={() => setFilter("all")}>
                  Show all answers
                </Button>
              </CardContent>
            </Card>
          ) : (
            visibleItems.map((item) => (
              <Card
                key={item.id}
                className={isOnHold(item) ? "border-destructive/50" : !item.is_active ? "opacity-60" : ""}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {!hasSource(item) && <Badge variant="outline">No source photo</Badge>}
                        {hasSource(item) && (
                          <Badge variant="secondary" className="max-w-full truncate">
                            From photo: {item.source_caption || "Library photo"}
                          </Badge>
                        )}
                        {isOnHold(item) && (
                          <Badge variant="destructive">
                            On hold · check {(item.unverified_numbers ?? []).join(", ")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {hasSource(item) && (
                          <QASourceDialog item={item} onConfirm={() => confirmNumbers(item.id)} />
                        )}
                        <AttachSourceDialog
                          item={item}
                          repository={qaItems}
                          onSave={(patch) => attachSource(item.id, patch)}
                        />
                        <QAHistoryDialog qaId={item.id} refreshKey={item.updated_at} />
                      </div>
                    </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Question</Label>
                        <Input
                          value={item.question}
                          onChange={(e) =>
                            setQaItems(
                              qaItems.map((q) =>
                                q.id === item.id ? { ...q, question: e.target.value } : q
                              )
                            )
                          }
                          onBlur={() => updateQA(item.id, { question: item.question })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Answer</Label>
                        <Textarea
                          value={item.answer}
                          onChange={(e) =>
                            setQaItems(
                              qaItems.map((q) =>
                                q.id === item.id ? { ...q, answer: e.target.value } : q
                              )
                            )
                          }
                          onBlur={() => updateQA(item.id, { answer: item.answer })}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 pt-5">
                      <Switch
                        checked={item.is_active}
                        disabled={isOnHold(item)}
                        aria-label={
                          isOnHold(item)
                            ? "On hold until numbers are confirmed"
                            : item.is_active
                              ? "Used by chatbots"
                              : "Not used by chatbots"
                        }
                        onCheckedChange={(checked) =>
                          updateQA(item.id, { is_active: checked })
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Q&A?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this Q&A entry from all card chatbots.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteQA(item.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
