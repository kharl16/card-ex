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
import { ScanText, Loader2, Square, Save, X, AlertTriangle, ExternalLink } from "lucide-react";
import {
  buildDrafts,
  chunk,
  findUnverifiedNumbers,
  normalizeQuestion,
  PHOTO_CATEGORY_TABLES,
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

  const saveSelected = async () => {
    const chosen = drafts.filter((d) => d.selected && d.question.trim() && d.answer.trim());
    if (!chosen.length) return;
    setSaving(true);
    const { error } = await supabase.from("ai_training_qa").insert(
      chosen.map((d, i) => ({
        question: d.question.trim(),
        answer: d.answer.trim(),
        card_id: null,
        sort_order: existingCount + i,
      })),
    );
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Could not save to the repository");
      return;
    }
    toast.success(`${chosen.length} Q&A saved — every card chatbot can use them now`);
    const savedKeys = new Set(chosen.map((d) => d.key));
    setDrafts((prev) => prev.filter((d) => !savedKeys.has(d.key)));
    onSaved();
  };

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
                <Button className="min-h-11 gap-2" onClick={saveSelected} disabled={!selectedCount || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save {selectedCount} to Repository
                </Button>
              </div>
            </div>

            {grouped.map(([imageId, items]) => {
              const src = sources[imageId];
              const checkText = [src.extractedText, src.srp, src.caption].filter(Boolean).join("\n");
              const images = [
                { url: src.url, label: "Front" },
                ...(src.url2 ? [{ url: src.url2, label: "Back" }] : []),
              ];
              return (
                <article
                  key={imageId}
                  className="grid gap-4 rounded-2xl border border-border p-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                >
                  <section aria-label="Source photo and text read from it" className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold break-words">{src.caption || "Untitled photo"}</h3>
                      {src.srp && <Badge variant="outline">Listed price: {src.srp}</Badge>}
                    </div>
                    <div className={`grid gap-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {images.map((img) => (
                        <a
                          key={img.label}
                          href={img.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group block space-y-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <img
                            src={img.url}
                            alt={`${src.caption ?? "Library photo"} — ${img.label.toLowerCase()}`}
                            className="max-h-80 w-full rounded-xl border border-border bg-muted/30 object-contain"
                            loading="lazy"
                          />
                          <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                            {images.length > 1 ? img.label : "Photo"} · Open full size
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Text read from the photo
                      </p>
                      <div
                        className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/20 p-3 text-sm leading-relaxed"
                        tabIndex={0}
                        aria-label="Original text read from the photo"
                      >
                        {src.extractedText || (
                          <span className="text-muted-foreground">No readable text was found on this photo.</span>
                        )}
                      </div>
                    </div>
                  </section>

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
                              <p className="flex items-start gap-1.5 text-xs text-destructive">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Check {unverified.join(", ")} — not found in the photo text.
                                </span>
                              </p>
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
    </Card>
  );
}
