import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";
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

interface BulkImportDialogProps {
  cardId?: string | null; // null = global
  onImported: () => void;
  existingCount: number;
}

export function BulkImportDialog({ cardId, onImported, existingCount }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<{ question: string; answer: string }[]>([]);

  const parseText = (raw: string) => {
    const pairs: { question: string; answer: string }[] = [];
    // Support formats:
    // Q: question\nA: answer
    // question | answer  (pipe separated)
    // "question","answer" (CSV)
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Q:/A: format
      if (/^Q\s*[:\.]/i.test(line)) {
        const q = line.replace(/^Q\s*[:\.]\s*/i, "").trim();
        const nextLine = lines[i + 1];
        if (nextLine && /^A\s*[:\.]/i.test(nextLine)) {
          const a = nextLine.replace(/^A\s*[:\.]\s*/i, "").trim();
          if (q && a) pairs.push({ question: q, answer: a });
          i += 2;
          continue;
        }
      }
      
      // Pipe separated: question | answer
      if (line.includes("|")) {
        const [q, ...rest] = line.split("|");
        const a = rest.join("|").trim();
        if (q?.trim() && a) pairs.push({ question: q.trim(), answer: a });
        i++;
        continue;
      }

      // CSV: "question","answer"
      const csvMatch = line.match(/^"([^"]+)"\s*,\s*"([^"]+)"$/);
      if (csvMatch) {
        pairs.push({ question: csvMatch[1], answer: csvMatch[2] });
        i++;
        continue;
      }

      i++;
    }
    return pairs;
  };

  const handlePreview = () => {
    const result = parseText(text);
    if (result.length === 0) {
      toast.error("No Q&A pairs detected. Use formats: Q:/A:, pipe (|), or CSV.");
      return;
    }
    setParsed(result);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    
    const rows = parsed.map((p, i) => ({
      question: p.question,
      answer: p.answer,
      card_id: cardId ?? null,
      sort_order: existingCount + i,
    }));

    const { error } = await supabase.from("ai_training_qa").insert(rows);
    
    if (error) {
      toast.error("Import failed");
      console.error(error);
    } else {
      toast.success(`${parsed.length} Q&A pairs imported`);
      setText("");
      setParsed([]);
      setOpen(false);
      onImported();
    }
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setParsed([]); setText(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Import Q&A
          </DialogTitle>
          <DialogDescription>
            Paste multiple Q&A pairs at once using any of these formats:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="bg-muted rounded-lg p-3 space-y-1 text-xs font-mono">
            <p className="font-sans text-xs font-medium text-muted-foreground mb-2">Supported formats:</p>
            <p>Q: What is your product?</p>
            <p>A: We sell digital business cards.</p>
            <p className="text-muted-foreground mt-1">— or —</p>
            <p>What is your product? | We sell digital business cards.</p>
            <p className="text-muted-foreground mt-1">— or —</p>
            <p>"What is your product?","We sell digital business cards."</p>
          </div>

          <div>
            <Label>Paste your Q&A pairs</Label>
            <Textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setParsed([]); }}
              rows={8}
              placeholder="Paste Q&A pairs here..."
              className="font-mono text-xs"
            />
          </div>

          {parsed.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-green-600">
                ✓ {parsed.length} Q&A pairs detected:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {parsed.map((p, i) => (
                  <div key={i} className="text-xs border-l-2 border-primary/30 pl-2">
                    <p className="font-medium">Q: {p.question}</p>
                    <p className="text-muted-foreground">A: {p.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {parsed.length === 0 ? (
            <Button onClick={handlePreview} disabled={!text.trim()}>
              Preview
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={importing} className="gap-1.5">
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import {parsed.length} pairs
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
