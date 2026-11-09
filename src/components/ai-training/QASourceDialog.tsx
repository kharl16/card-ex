import { useState } from "react";
import { AlertTriangle, CheckCircle2, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhotoSourcePanel } from "@/components/ai-training/PhotoSourcePanel";
import { isOnHold } from "@/lib/photoKnowledge";
import type { Tables } from "@/integrations/supabase/types";

const CATEGORY_LABELS: Record<string, string> = {
  packages: "Package",
  products: "Product",
  brochures: "Brochure",
  testimonies: "Testimony",
};

interface Props {
  item: Tables<"ai_training_qa">;
  onConfirm: () => Promise<boolean>;
}

/** Reopen the photo and text an answer was drawn from, and confirm its flagged numbers. */
export function QASourceDialog({ item, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const held = isOnHold(item);
  const numbers = item.unverified_numbers ?? [];

  const confirm = async () => {
    setBusy(true);
    const ok = await onConfirm();
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={held ? "default" : "outline"} className="min-h-11 gap-2">
          <ImageIcon className="h-4 w-4" />
          {held ? "Review & confirm" : "View source photo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Where this answer came from</DialogTitle>
          <DialogDescription>Compare the answer with the photo and the text read from it.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <PhotoSourcePanel
            url={item.source_image_url}
            url2={item.source_image_url_2}
            caption={item.source_caption}
            srp={item.source_srp}
            extractedText={item.source_extracted_text}
            categoryLabel={item.source_category ? CATEGORY_LABELS[item.source_category] : undefined}
          />
          <section aria-label="Saved answer" className="min-w-0 space-y-3">
            <div className="space-y-1 rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Question</p>
              <p className="text-sm break-words">{item.question}</p>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer</p>
              <p className="whitespace-pre-wrap text-sm break-words">{item.answer}</p>
            </div>

            {numbers.length > 0 && held && (
              <div className="space-y-3 rounded-xl border border-destructive/40 p-3">
                <p className="flex items-start gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {numbers.join(", ")} {numbers.length > 1 ? "were" : "was"} not found in the photo text. This
                    answer is on hold and no chatbot uses it.
                  </span>
                </p>
                <Button className="min-h-11 w-full gap-2" onClick={confirm} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  I checked — {numbers.length > 1 ? "these numbers are" : "this number is"} correct
                </Button>
                <p className="text-xs text-muted-foreground">
                  If a number is wrong, close this and fix the answer first.
                </p>
              </div>
            )}

            {numbers.length > 0 && !held && item.numbers_confirmed_at && (
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  You confirmed {numbers.join(", ")} on {new Date(item.numbers_confirmed_at).toLocaleDateString()}.
                </span>
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
