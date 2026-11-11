import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, History, Loader2, PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

export type QAHistoryEntry = Tables<"ai_training_qa_history">;

const EVENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  created: { label: "Saved", variant: "secondary" },
  edited: { label: "Edited", variant: "secondary" },
  source_attached: { label: "Source photo attached", variant: "secondary" },
  source_changed: { label: "Source photo changed", variant: "secondary" },
  source_removed: { label: "Source photo removed", variant: "outline" },
  put_on_hold: { label: "Put on hold", variant: "destructive" },
  hold_cleared: { label: "Hold cleared", variant: "default" },
  confirmed: { label: "Numbers confirmed", variant: "default" },
  activated: { label: "Switched on", variant: "outline" },
  deactivated: { label: "Switched off", variant: "outline" },
  deleted: { label: "Deleted", variant: "destructive" },
};

export const formatHistoryTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function Thumb({ url, caption }: { url: string | null; caption: string | null }) {
  return (
    <figure className="min-w-0 flex-1 space-y-1">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={caption ?? "Source photo"}
            loading="lazy"
            className="h-24 w-full rounded-xl border border-border bg-muted/30 object-contain"
          />
        </a>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          No photo
        </div>
      )}
      <figcaption className="truncate text-xs text-muted-foreground">{caption || "Untitled photo"}</figcaption>
    </figure>
  );
}

function BeforeAfter({ label, before, after }: { label: string; before: string; after: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/30 p-2 text-sm text-muted-foreground line-through decoration-muted-foreground/50">
          {before}
        </p>
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/30 p-2 text-sm">{after}</p>
      </div>
    </div>
  );
}

export function QAHistoryEntryView({ entry }: { entry: QAHistoryEntry }) {
  const events = entry.events ?? [];
  const sourceMoved = events.some((e) => e === "source_changed" || e === "source_attached" || e === "source_removed");
  const flagged = (entry.unverified_numbers ?? []).length > 0;

  return (
    <li className="space-y-3 rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {events.map((e) => {
          const meta = EVENT_LABELS[e] ?? { label: e, variant: "outline" as const };
          return (
            <Badge key={e} variant={meta.variant}>
              {meta.label}
            </Badge>
          );
        })}
      </div>
      <p className="text-sm">
        <time dateTime={entry.created_at}>{formatHistoryTime(entry.created_at)}</time>
        <span className="text-muted-foreground"> · by {entry.actor_name || (entry.note ? "unknown" : "the system")}</span>
      </p>
      {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}

      {entry.previous_question !== null && (
        <BeforeAfter label="Question" before={entry.previous_question} after={entry.question} />
      )}
      {entry.previous_answer !== null && (
        <BeforeAfter label="Answer" before={entry.previous_answer} after={entry.answer} />
      )}

      {sourceMoved ? (
        <div className="flex items-center gap-2">
          <Thumb url={entry.previous_source_image_url} caption={entry.previous_source_caption} />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="changed to" />
          <Thumb url={entry.source_image_url} caption={entry.source_caption} />
        </div>
      ) : (
        entry.source_caption && (
          <p className="text-xs text-muted-foreground">Source photo: {entry.source_caption}</p>
        )
      )}

      {entry.hold_reason && (
        <p className="flex items-start gap-1.5 rounded-xl border border-destructive/40 p-2 text-sm text-destructive">
          <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>On hold: {entry.hold_reason}. Chatbots stopped using this answer.</span>
        </p>
      )}

      {entry.numbers_confirmed_at ? (
        <p className="flex items-start gap-1.5 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            This version confirmed by <strong>{entry.confirmed_by_name || "an admin"}</strong> on{" "}
            <time dateTime={entry.numbers_confirmed_at}>{formatHistoryTime(entry.numbers_confirmed_at)}</time>
            {flagged && <> · checked {(entry.unverified_numbers ?? []).join(", ")}</>}
          </span>
        </p>
      ) : (
        flagged && <p className="text-sm text-muted-foreground">This version was not confirmed.</p>
      )}

      {!events.includes("deleted") && (
        <p className="text-xs text-muted-foreground">
          Chatbots: {entry.is_active ? "using this version" : "not using this version"}
        </p>
      )}
    </li>
  );
}

/** Timeline of every verification-relevant change to one saved answer, newest first. */
export function QAHistoryDialog({ qaId, refreshKey }: { qaId: string; refreshKey?: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<QAHistoryEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(false);
    supabase
      .from("ai_training_qa_history")
      .select("*")
      .eq("qa_id", qaId)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(true);
        else setEntries((data as QAHistoryEntry[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [open, qaId, refreshKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 gap-2">
          <History className="h-4 w-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification history</DialogTitle>
          <DialogDescription>
            Every edit, source photo change, hold and confirmation for this answer, newest first.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">We couldn't load the history. Close this and try again.</p>
        ) : entries === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading history" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history recorded for this answer yet.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <QAHistoryEntryView key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
