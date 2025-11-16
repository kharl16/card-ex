import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

// Helper function to escape vCard values
function escapeVCardValue(value: string = ""): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Helper function to assemble FN (formatted name)
function assembleFN(card: Partial<CardData>): string {
  const base = [card.prefix, card.first_name, card.middle_name, card.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  
  if (!card.suffix) return base;
  
  // Use comma for generational suffixes (Jr., Sr., II, III, IV)
  const isGenerational = /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(card.suffix);
  const separator = isGenerational ? ", " : " ";
  
  return `${base}${separator}${card.suffix}`.trim();
}

interface VCardPreviewDialogProps {
  card: Partial<CardData>;
}

export default function VCardPreviewDialog({ card }: VCardPreviewDialogProps) {
  const lastName = card.last_name || '';
  const firstName = card.first_name || '';
  const middleName = card.middle_name || '';
  const prefix = card.prefix || '';
  const suffix = card.suffix || '';
  
  const N = [
    escapeVCardValue(lastName),
    escapeVCardValue(firstName),
    escapeVCardValue(middleName),
    escapeVCardValue(prefix),
    escapeVCardValue(suffix)
  ].join(';');
  
  const FN = escapeVCardValue(assembleFN(card));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Preview vCard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>vCard Preview</DialogTitle>
          <DialogDescription>
            This is how your contact information will appear when imported into contacts apps
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">Display Name (FN)</h4>
              <p className="text-sm font-mono bg-background p-2 rounded border">
                {FN || <span className="text-muted-foreground italic">Empty</span>}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-2">Structured Name (N)</h4>
              <p className="text-xs text-muted-foreground mb-1">
                Format: Family; Given; Additional; Prefix; Suffix
              </p>
              <p className="text-sm font-mono bg-background p-2 rounded border break-all">
                {N || <span className="text-muted-foreground italic">Empty</span>}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4 space-y-2">
            <h4 className="text-sm font-semibold mb-2">Field Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Prefix:</span>
                <span className="ml-2 font-medium">{prefix || <span className="text-muted-foreground italic">-</span>}</span>
              </div>
              <div>
                <span className="text-muted-foreground">First Name:</span>
                <span className="ml-2 font-medium">{firstName || <span className="text-muted-foreground italic">-</span>}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Middle Name:</span>
                <span className="ml-2 font-medium">{middleName || <span className="text-muted-foreground italic">-</span>}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Name:</span>
                <span className="ml-2 font-medium">{lastName || <span className="text-muted-foreground italic">-</span>}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Suffix:</span>
                <span className="ml-2 font-medium">{suffix || <span className="text-muted-foreground italic">-</span>}</span>
              </div>
            </div>
          </div>

          {card.title && (
            <div className="text-sm">
              <span className="text-muted-foreground">Title:</span>
              <span className="ml-2 font-medium">{card.title}</span>
            </div>
          )}
          
          {card.company && (
            <div className="text-sm">
              <span className="text-muted-foreground">Organization:</span>
              <span className="ml-2 font-medium">{card.company}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
