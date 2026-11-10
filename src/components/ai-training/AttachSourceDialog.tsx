import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ImagePlus, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhotoSourcePanel } from "@/components/ai-training/PhotoSourcePanel";
import {
  PHOTO_CATEGORY_TABLES,
  buildSourcePatch,
  findUnverifiedNumbers,
  hasPhotoSource,
  numbersKey,
  rankPhotoMatches,
  sourceCheckText,
  type PhotoCategory,
  type PhotoSource,
  type SourcePatch,
} from "@/lib/photoKnowledge";
import type { Tables } from "@/integrations/supabase/types";

type QAItem = Tables<"ai_training_qa">;

const CATEGORIES: { key: PhotoCategory; label: string; single: string }[] = [
  { key: "packages", label: "Packages", single: "Package" },
  { key: "products", label: "Products", single: "Product" },
  { key: "brochures", label: "Brochures", single: "Brochure" },
  { key: "testimonies", label: "Testimonies", single: "Testimony" },
];

type Tab = "best" | PhotoCategory;

interface LibraryPhoto {
  id: string;
  url: string;
  url_2?: string | null;
  caption: string | null;
  srp?: string | null;
  category: PhotoCategory;
}

interface Props {
  item: QAItem;
  /** Saved repository rows, so text already read from a photo is reused instead of read again. */
  repository: QAItem[];
  onSave: (patch: SourcePatch) => Promise<boolean>;
}

/** Find the right library photo for an answer, review it side by side, then link it. */
export function AttachSourceDialog({ item, repository, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [tab, setTab] = useState<Tab>("best");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<LibraryPhoto | null>(null);
  const [source, setSource] = useState<PhotoSource | null>(null);
  const [reading, setReading] = useState(false);
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const replacing = hasPhotoSource(item);

  const knownText = useMemo(() => {
    const map: Record<string, string> = {};
    repository.forEach((r) => {
      if (r.source_image_id && r.source_extracted_text && !map[r.source_image_id]) {
        map[r.source_image_id] = r.source_extracted_text;
      }
    });
    return map;
  }, [repository]);

  useEffect(() => {
    if (!open || photos) return;
    (async () => {
      const lists = await Promise.all(
        CATEGORIES.map(async ({ key }) => {
          const { data, error } = await supabase
            .from(PHOTO_CATEGORY_TABLES[key] as "global_package_images")
            .select(key === "testimonies" ? "id, url, caption" : "id, url, url_2, caption, srp")
            .eq("is_active", true)
            .order("sort_index", { ascending: true });
          if (error) throw error;
          return ((data ?? []) as unknown as Omit<LibraryPhoto, "category">[]).map((p) => ({ ...p, category: key }));
        }),
      );
      setPhotos(lists.flat());
    })().catch((err) => {
      console.error(err);
      toast.error("Could not load library photos");
      setPhotos([]);
    });
  }, [open, photos]);

  const reset = () => {
    setPicked(null);
    setSource(null);
    setConfirmedFor(null);
    setReading(false);
  };

  const visible = useMemo(() => {
    if (!photos) return [];
    const q = search.trim().toLowerCase();
    const pool = photos.filter(
      (p) => (tab === "best" || p.category === tab) && (!q || (p.caption ?? "").toLowerCase().includes(q)),
    );
    const ranked = rankPhotoMatches(item, pool, knownText);
    return tab === "best" && !q ? ranked.filter((r) => r.score > 0).slice(0, 12) : ranked;
  }, [photos, tab, search, item, knownText]);

  const pick = async (photo: LibraryPhoto) => {
    setPicked(photo);
    setConfirmedFor(null);
    const base = {
      imageId: photo.id,
      url: photo.url,
      url2: photo.url_2 ?? null,
      caption: photo.caption,
      srp: photo.srp ?? null,
    };
    if (knownText[photo.id]) {
      setSource({ ...base, extractedText: knownText[photo.id] });
      return;
    }
    setSource(null);
    setReading(true);
    const { data, error } = await supabase.functions.invoke("extract-photo-knowledge", {
      body: { category: photo.category, imageIds: [photo.id] },
    });
    setReading(false);
    const text = (data?.photos as { image_id: string; extracted_text: string }[] | undefined)?.find(
      (p) => p.image_id === photo.id,
    )?.extracted_text;
    if (error || typeof text !== "string") {
      toast.error("Could not read the text on this photo. Please try again.");
      setPicked(null);
      return;
    }
    setSource({ ...base, extractedText: text });
  };

  const unverified = source ? findUnverifiedNumbers(item.answer, sourceCheckText(source)) : [];
  const confirmed = unverified.length > 0 && confirmedFor === numbersKey(unverified);

  const save = async () => {
    if (!source || !picked) return;
    setSaving(true);
    const ok = await onSave(buildSourcePatch(item, source, picked.category, confirmedFor));
    setSaving(false);
    if (ok) {
      setOpen(false);
      reset();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={replacing ? "ghost" : "outline"} className="min-h-11 gap-2">
          <ImagePlus className="h-4 w-4" />
          {replacing ? "Change source photo" : "Attach source photo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{picked ? "Check this match" : "Which photo is this answer from?"}</DialogTitle>
          <DialogDescription>
            {picked
              ? "Compare the answer with the photo and its text. Nothing changes until you press Attach."
              : "Pick the library photo this answer came from. Closest matches are shown first."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-xl bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer</p>
          <p className="text-sm font-medium break-words">{item.question}</p>
          <p className="whitespace-pre-wrap text-sm break-words text-muted-foreground">{item.answer}</p>
        </div>

        {!picked ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Photo groups">
              {[{ key: "best" as Tab, label: "Best matches" }, ...CATEGORIES].map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant={tab === key ? "default" : "outline"}
                  className="min-h-11"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search photo names"
                aria-label="Search photo names"
                className="min-h-11 pl-9"
              />
            </div>

            {!photos ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading library photos…
              </p>
            ) : visible.length === 0 ? (
              <p className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
                {tab === "best" && !search
                  ? "No close matches. Choose a group above to browse all photos."
                  : "No photos found."}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {visible.map(({ photo, score }) => (
                  <li key={`${photo.category}-${photo.id}`}>
                    <button
                      type="button"
                      onClick={() => void pick(photo)}
                      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <img
                        src={photo.url}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full bg-muted/30 object-cover"
                      />
                      <span className="flex flex-1 flex-col gap-0.5 p-2">
                        <span className="line-clamp-2 text-sm font-medium break-words">
                          {photo.caption || "Untitled photo"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {CATEGORIES.find((c) => c.key === photo.category)?.single}
                          {tab === "best" && score > 0 && " · Suggested"}
                          {item.source_image_id === photo.id && " · Current"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reading || !source ? (
              <p className="flex items-center gap-2 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading the text on this photo…
              </p>
            ) : (
              <>
                <PhotoSourcePanel
                  url={source.url}
                  url2={source.url2}
                  caption={source.caption}
                  srp={source.srp}
                  extractedText={source.extractedText}
                  categoryLabel={CATEGORIES.find((c) => c.key === picked.category)?.single}
                />
                {unverified.length > 0 ? (
                  <div className="space-y-2 rounded-xl border border-destructive/40 p-3">
                    <p className="flex items-start gap-1.5 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Check {unverified.join(", ")} — not found in this photo's text.</span>
                    </p>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                      <Checkbox
                        className="h-5 w-5"
                        checked={confirmed}
                        onCheckedChange={(c) => setConfirmedFor(c === true ? numbersKey(unverified) : null)}
                      />
                      <span>
                        I checked {unverified.join(", ")} — {unverified.length > 1 ? "they are" : "it is"} correct
                      </span>
                    </label>
                    {!confirmed && (
                      <p className="text-xs text-muted-foreground">
                        If you attach without confirming, this answer goes on hold and no chatbot uses it.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Every number in this answer appears on the photo.</span>
                  </p>
                )}
              </>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="min-h-11 gap-2" onClick={reset} disabled={saving}>
                <ArrowLeft className="h-4 w-4" /> Choose a different photo
              </Button>
              <Button className="min-h-11 gap-2" onClick={save} disabled={!source || reading || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Attach this photo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
