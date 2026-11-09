import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScanText, Loader2, Square, Save, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PhotoSourcePanel } from "@/components/ai-training/PhotoSourcePanel";
import {
  buildDrafts,
  chunk,
  findUnverifiedNumbers,
  isDraftConfirmed,
  normalizeQuestion,
  numbersKey,
  PHOTO_CATEGORY_TABLES,
  sourceCheckText,
  toRepositoryRow,
  type DraftQA,
  type PhotoCategory,
  type PhotoSource,
} from "@/lib/photoKnowledge";

const CATEGORIES: { key: PhotoCategory; label: string }[] = [
  { key: "packages", label: "Packages" },
  { key: "products", label: "Products" },
  { key: "brochures", label: "Brochures" },
  { key: "testimonies", label: "Testimonies" },
];

const BATCH_SIZE = 3;

interface Photo {
  id: string;
  url: string;
  url_2?: string | null;
  caption: string | null;
  srp?: string | null;
}

interface ScannedSource extends PhotoSource {
  category: PhotoCategory;
  /** Number of Q&As the AI suggested, so photos with none still show for review. */
  suggested: number;
}

interface Props {
  existingQuestions: string[];
  existingCount: number;
  onSaved: () => void;
}

export function PhotoKnowledgeExtractor({ existingQuestions, existingCount, onSaved }: Props) {
  const [category, setCategory] = useState<PhotoCategory>("packages");
  const [counts, setCounts] = useState<Partial<Record<PhotoCategory, number>>>({});
  const [sources, setSources] = useState<Record<string, ScannedSource>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftQA[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failed, setFailed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        CATEGORIES.map(async ({ key }) => {
          const { count } = await supabase
            .from(PHOTO_CATEGORY_TABLES[key] as "global_package_images")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true);
          return [key, count ?? 0] as const;
        }),
      );
      setCounts(Object.fromEntries(entries));
    })();
  }, []);

  const selectedCount = useMemo(() => drafts.filter((d) => d.selected).length, [drafts]);

  const grouped = useMemo(() => {
    const map = new Map<string, DraftQA[]>();
    drafts.forEach((d) => map.set(d.imageId, [...(map.get(d.imageId) ?? []), d]));
    return order
      .filter((id) => sources[id] && ((map.get(id)?.length ?? 0) > 0 || sources[id].suggested === 0))
      .map((id) => [id, map.get(id) ?? []] as const);
  }, [drafts, order, sources]);

  const startScan = async () => {
    const { data, error } = await supabase
      .from(PHOTO_CATEGORY_TABLES[category] as "global_package_images")
      .select(category === "testimonies" ? "id, url, caption" : "id, url, url_2, caption, srp")
      .eq("is_active", true)
      .order("sort_index", { ascending: true });
    if (error || !data?.length) {
      toast.error(error ? "Could not load photos" : "No photos in this category");
      return;
    }

    const rows = data as unknown as Photo[];
    const byId = Object.fromEntries(rows.map((p) => [p.id, p]));
    const batches = chunk(rows.map((p) => p.id), BATCH_SIZE);
    const seen = new Set(
      [...existingQuestions, ...drafts.filter((d) => !byId[d.imageId]).map((d) => d.question)].map(normalizeQuestion),
    );

    stopRef.current = false;
    setScanning(true);
    setFailed(0);
    setProgress({ done: 0, total: rows.length });

    for (const ids of batches) {
      if (stopRef.current) break;
      const { data: res, error: fnError } = await supabase.functions.invoke("extract-photo-knowledge", {
        body: { category, imageIds: ids },
      });
      if (fnError || !res?.photos) {
        let message = "Some photos could not be read";
        try {
          const body = await (fnError as { context?: Response })?.context?.json?.();
          if (body?.error && typeof body.error === "string") message = body.error;
        } catch {
          /* keep default message */
        }
        setFailed((f) => f + ids.length);
        if (/credits|busy|Super Admin|Unauthorized/i.test(message)) {
          toast.error(message);
          break;
        }
      } else {
        const results = res.photos as { image_id: string; extracted_text: string; qa: { question: string; answer: string }[] }[];
        const next = buildDrafts(results, [], seen);
        const scanned: ScannedSource[] = results
          .filter((r) => byId[r.image_id])
          .map((r) => {
            const p = byId[r.image_id];
            return {
              category,
              imageId: p.id,
              url: p.url,
              url2: p.url_2 ?? null,
              caption: p.caption,
              srp: p.srp ?? null,
              extractedText: r.extracted_text ?? "",
              suggested: next.filter((d) => d.imageId === p.id).length,
            };
          });
        setSources((prev) => ({ ...prev, ...Object.fromEntries(scanned.map((x) => [x.imageId, x])) }));
        setOrder((prev) => [...prev.filter((id) => !byId[id] || !scanned.some((x) => x.imageId === id)), ...scanned.map((x) => x.imageId)]);
        setDrafts((prev) => [...prev.filter((d) => !scanned.some((x) => x.imageId === d.imageId)), ...next]);
      }
      setProgress((p) => ({ ...p, done: Math.min(p.total, p.done + ids.length) }));
    }

    setScanning(false);
    toast.success(stopRef.current ? "Scan stopped" : "Scan finished — review the answers below");
  };

  const updateDraft = (key: string, patch: Partial<DraftQA>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const chosenDrafts = () =>
    drafts.filter((d) => d.selected && d.question.trim() && d.answer.trim() && sources[d.imageId]);

  const unconfirmedChosen = () =>
    chosenDrafts().filter(
      (d) => !isDraftConfirmed(d, findUnverifiedNumbers(d.answer, sourceCheckText(sources[d.imageId]))),
    );

  const requestSave = () => {
    if (unconfirmedChosen().length > 0) setConfirmOpen(true);
    else void saveSelected();
  };

  const saveSelected = async () => {
    setConfirmOpen(false);
    const chosen = chosenDrafts();
    if (!chosen.length) return;
    const rows = chosen.map((d, i) => {
      const src = sources[d.imageId];
      return toRepositoryRow(d, src, src.category, existingCount + i);
    });
    setSaving(true);
    const { error } = await supabase.from("ai_training_qa").insert(rows);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Could not save to the repository");
      return;
    }
    const held = rows.filter((r) => !r.is_active).length;
    const live = rows.length - held;
    toast.success(
      held > 0
        ? `${live} Q&A now used by chatbots · ${held} on hold until you confirm their numbers`
        : `${live} Q&A saved — every card chatbot can use them now`,
    );
    const savedKeys = new Set(chosen.map((d) => d.key));
    setDrafts((prev) => prev.filter((d) => !savedKeys.has(d.key)));
    onSaved();
  };

  const pendingCount = confirmOpen ? unconfirmedChosen().length : 0;

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          Extract from Global Photos
        </CardTitle>
        <CardDescription>
          Read the text on your library photos and turn it into Q&A. Nothing is saved until you review and press
          Save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map(({ key, label }) => (
            <Button
              key={key}
              type="button"
              variant={category === key ? "default" : "outline"}
              className="min-h-11 justify-between gap-2"
              disabled={scanning}
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
            >
              <span>{label}</span>
              <span className="text-xs opacity-80">{counts[key] ?? "…"}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {scanning ? (
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => (stopRef.current = true)}>
              <Square className="h-4 w-4" /> Stop after this batch
            </Button>
          ) : (
            <Button className="min-h-11 gap-2" onClick={startScan} disabled={!counts[category]}>
              <ScanText className="h-4 w-4" />
              Scan {counts[category] ?? ""} {CATEGORIES.find((c) => c.key === category)?.label} photos
            </Button>
          )}
        </div>

        {(scanning || progress.total > 0) && (
          <div className="space-y-1" aria-live="polite">
            <Progress value={pct} />
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {scanning && <Loader2 className="h-4 w-4 animate-spin" />}
              {progress.done} of {progress.total} photos read
              {failed > 0 && <span className="text-destructive">· {failed} could not be read</span>}
            </p>
          </div>
        )}

        {grouped.length > 0 && (
          <div className="space-y-4">
            <div className="sticky top-[72px] z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur">
              <p className="text-sm">
                <strong>{selectedCount}</strong> of {drafts.length} selected
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => setDrafts((p) => p.map((d) => ({ ...d, selected: !d.duplicate })))}
                >
                  Select all new
                </Button>
                <Button variant="ghost" className="min-h-11" onClick={() => setDrafts((p) => p.map((d) => ({ ...d, selected: false })))}>
                  Clear
                </Button>
                <Button className="min-h-11 gap-2" onClick={requestSave} disabled={!selectedCount || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save {selectedCount} to Repository
                </Button>
              </div>
            </div>

            {grouped.map(([imageId, items]) => {
              const src = sources[imageId];
              const checkText = sourceCheckText(src);
              return (
                <article
                  key={imageId}
                  className="grid gap-4 rounded-2xl border border-border p-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                >
                  <PhotoSourcePanel
                    url={src.url}
                    url2={src.url2}
                    caption={src.caption}
                    srp={src.srp}
                    extractedText={src.extractedText}
                  />

                  <section aria-label="Suggested questions and answers" className="min-w-0 space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Suggested Q&A ({items.length})
                    </p>
                    {items.length === 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 p-3">
                        <p className="text-sm text-muted-foreground">No Q&A was suggested for this photo.</p>
                        <Button
                          variant="ghost"
                          className="min-h-11"
                          onClick={() => setOrder((p) => p.filter((id) => id !== imageId))}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                    {items.map((d) => {
                      const unverified = findUnverifiedNumbers(d.answer, checkText);
                      return (
                        <div
                          key={d.key}
                          className={`flex gap-3 rounded-xl bg-muted/30 p-3 ${d.selected ? "" : "opacity-70"}`}
                        >
                          <Checkbox
                            className="mt-2 h-5 w-5"
                            checked={d.selected}
                            onCheckedChange={(c) => updateDraft(d.key, { selected: c === true })}
                            aria-label="Include this Q&A"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            {d.duplicate && <Badge variant="secondary">Already in repository</Badge>}
                            <Input
                              value={d.question}
                              onChange={(e) => updateDraft(d.key, { question: e.target.value })}
                              aria-label="Question"
                            />
                            <Textarea
                              value={d.answer}
                              onChange={(e) => updateDraft(d.key, { answer: e.target.value })}
                              rows={3}
                              aria-label="Answer"
                            />
                            {unverified.length > 0 && (
                              <div className="space-y-2 rounded-xl border border-destructive/40 p-2">
                                <p className="flex items-start gap-1.5 text-xs text-destructive">
                                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>Check {unverified.join(", ")} — not found in the photo text.</span>
                                </p>
                                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                                  <Checkbox
                                    className="h-5 w-5"
                                    checked={isDraftConfirmed(d, unverified)}
                                    onCheckedChange={(c) =>
                                      updateDraft(d.key, { confirmedFor: c === true ? numbersKey(unverified) : null })
                                    }
                                  />
                                  <span>
                                    I checked {unverified.join(", ")} — {unverified.length > 1 ? "they are" : "it is"}{" "}
                                    correct
                                  </span>
                                  {isDraftConfirmed(d, unverified) && (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                  )}
                                </label>
                                {!isDraftConfirmed(d, unverified) && (
                                  <p className="text-xs text-muted-foreground">
                                    Until you confirm, this answer is saved on hold and no chatbot will use it.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            aria-label="Remove this Q&A"
                            onClick={() => setDrafts((p) => p.filter((x) => x.key !== d.key))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCount} {pendingCount === 1 ? "answer has" : "answers have"} unconfirmed numbers
            </AlertDialogTitle>
            <AlertDialogDescription>
              These numbers were not found on the photo and you haven't confirmed them. If you save now, those answers
              go to the repository on hold — no chatbot will use them until you confirm them there. The rest will be
              used right away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Go back and check</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => void saveSelected()}>
              Save, keep {pendingCount} on hold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
