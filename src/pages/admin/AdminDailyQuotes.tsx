import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, ExternalLink, Quote, Upload, Sun, Sunset, Moon, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyQuote {
  id: string;
  text: string;
  author: string;
  source_url: string | null;
  sort_index: number;
  is_active: boolean;
}

export default function AdminDailyQuotes() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<DailyQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ text: "", author: "", source_url: "" });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mirror MotivationalQuote's deterministic slot logic
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const activeQuotes = useMemo(() => quotes.filter((q) => q.is_active), [quotes]);
  const todaysQuotes = useMemo(() => {
    if (activeQuotes.length === 0) return null;
    return {
      morning: activeQuotes[(dayOfYear * 3 + 0) % activeQuotes.length],
      afternoon: activeQuotes[(dayOfYear * 3 + 1) % activeQuotes.length],
      evening: activeQuotes[(dayOfYear * 3 + 2) % activeQuotes.length],
    };
  }, [activeQuotes, dayOfYear]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_quotes")
      .select("id, text, author, source_url, sort_index, is_active")
      .order("sort_index", { ascending: true });
    if (error) toast.error(error.message);
    else setQuotes((data ?? []) as DailyQuote[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const addQuote = async () => {
    if (!draft.text.trim() || !draft.author.trim()) {
      toast.error("Quote text and author are required");
      return;
    }
    setSaving(true);
    const nextSort = quotes.length ? Math.max(...quotes.map((q) => q.sort_index)) + 1 : 0;
    const { error } = await supabase.from("daily_quotes").insert({
      text: draft.text.trim(),
      author: draft.author.trim(),
      source_url: draft.source_url.trim() || null,
      sort_index: nextSort,
      is_active: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setDraft({ text: "", author: "", source_url: "" });
    toast.success("Quote added");
    load();
  };

  const updateQuote = async (id: string, patch: Partial<DailyQuote>) => {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    const { error } = await supabase.from("daily_quotes").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    const { error } = await supabase.from("daily_quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= quotes.length) return;
    const a = quotes[index];
    const b = quotes[target];
    const newQuotes = [...quotes];
    newQuotes[index] = { ...a, sort_index: b.sort_index };
    newQuotes[target] = { ...b, sort_index: a.sort_index };
    setQuotes(newQuotes.sort((x, y) => x.sort_index - y.sort_index));
    const [r1, r2] = await Promise.all([
      supabase.from("daily_quotes").update({ sort_index: b.sort_index }).eq("id", a.id),
      supabase.from("daily_quotes").update({ sort_index: a.sort_index }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) {
      toast.error("Reorder failed");
      load();
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["text", "author", "source_url"],
      ["The secret of getting ahead is getting started.", "Mark Twain", "https://en.wikiquote.org/wiki/Mark_Twain"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotes");
    XLSX.writeFile(wb, "daily-quotes-template.xlsx");
  };

  const handleBulkUpload = async (file: File) => {
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      const startSort = quotes.length ? Math.max(...quotes.map((q) => q.sort_index)) + 1 : 0;
      const payload = rows
        .map((r, i) => {
          const text = String(r.text ?? r.Text ?? r.quotation ?? r.Quotation ?? r.quote ?? r.Quote ?? "").trim();
          const author = String(r.author ?? r.Author ?? "Unknown").trim() || "Unknown";
          const source_url = String(r.source_url ?? r["Source URL"] ?? r.source ?? "").trim() || null;
          return text ? { text, author, source_url, sort_index: startSort + i, is_active: true } : null;
        })
        .filter(Boolean) as Array<{ text: string; author: string; source_url: string | null; sort_index: number; is_active: boolean }>;
      if (payload.length === 0) {
        toast.error("No valid rows found. Need a 'text' column.");
        return;
      }
      const { error } = await supabase.from("daily_quotes").insert(payload);
      if (error) throw error;
      toast.success(`Imported ${payload.length} quote${payload.length === 1 ? "" : "s"}`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/superadmin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Daily Quotes</h1>
              <p className="text-sm text-muted-foreground">
                Add, edit, reorder, and toggle quotes shown on the dashboard
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add a new quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Quote text</Label>
              <Textarea
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="The secret of getting ahead is getting started."
                rows={3}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Author</Label>
                <Input
                  value={draft.author}
                  onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                  placeholder="Mark Twain"
                />
              </div>
              <div className="space-y-2">
                <Label>Source URL (optional)</Label>
                <Input
                  value={draft.source_url}
                  onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
                  placeholder="https://en.wikiquote.org/wiki/..."
                />
              </div>
            </div>
            <Button onClick={addQuote} disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" /> Add quote
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            All quotes {quotes.length > 0 && <span className="text-muted-foreground font-normal">({quotes.length})</span>}
          </h2>
          {loading ? (
            <Skeleton className="h-64" />
          ) : quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          ) : (
            quotes.map((q, idx) => (
              <Card key={q.id} className={q.is_active ? "" : "opacity-60"}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => move(idx, 1)}
                        disabled={idx === quotes.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={q.text}
                        onChange={(e) => setQuotes((p) => p.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))}
                        onBlur={(e) => updateQuote(q.id, { text: e.target.value.trim() })}
                        rows={2}
                      />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Input
                          value={q.author}
                          onChange={(e) =>
                            setQuotes((p) => p.map((x) => (x.id === q.id ? { ...x, author: e.target.value } : x)))
                          }
                          onBlur={(e) => updateQuote(q.id, { author: e.target.value.trim() })}
                          placeholder="Author"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            value={q.source_url ?? ""}
                            onChange={(e) =>
                              setQuotes((p) => p.map((x) => (x.id === q.id ? { ...x, source_url: e.target.value } : x)))
                            }
                            onBlur={(e) =>
                              updateQuote(q.id, { source_url: e.target.value.trim() || null })
                            }
                            placeholder="Source URL (optional)"
                          />
                          {q.source_url && (
                            <a
                              href={q.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={q.is_active}
                            onCheckedChange={(checked) => updateQuote(q.id, { is_active: checked })}
                          />
                          <span className="text-sm text-muted-foreground">
                            {q.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteQuote(q.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
