import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LayoutTemplate, Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface TemplateSet {
  name: string;
  description: string;
  pairs: { question: string; answer: string }[];
}

const TEMPLATE_SETS: TemplateSet[] = [
  {
    name: "Business Hours & Location",
    description: "Common questions about availability and location",
    pairs: [
      { question: "What are your business hours?", answer: "We are open Monday to Friday, 9:00 AM to 5:00 PM. We are closed on weekends and holidays." },
      { question: "Where are you located?", answer: "Please check the location section on my card for our address and directions." },
      { question: "Do you offer weekend appointments?", answer: "We primarily operate on weekdays, but special arrangements can be made. Please contact me directly to discuss." },
    ],
  },
  {
    name: "Product & Service FAQ",
    description: "General product and service inquiries",
    pairs: [
      { question: "What products or services do you offer?", answer: "Please check my card's product section for a full list of what I offer. Feel free to contact me for specific inquiries." },
      { question: "How can I place an order?", answer: "You can reach out to me directly through the contact options on my card to place an order or discuss your needs." },
      { question: "Do you offer samples or demos?", answer: "Yes, I'd be happy to arrange a product demo or provide samples. Please contact me to schedule one." },
      { question: "What payment methods do you accept?", answer: "We accept various payment methods. Please contact me directly for specific payment arrangements." },
    ],
  },
  {
    name: "Pricing & Packages",
    description: "Questions about pricing, discounts, and packages",
    pairs: [
      { question: "What are your prices?", answer: "Pricing varies depending on the product or service. Please contact me directly for a personalized quote." },
      { question: "Do you offer discounts for bulk orders?", answer: "Yes, we offer special pricing for bulk orders. Please reach out to discuss volume discounts." },
      { question: "Do you have a referral or affiliate program?", answer: "Yes! Ask me about our referral program and how you can earn commissions by referring others." },
    ],
  },
  {
    name: "Contact & Support",
    description: "How to reach out and get support",
    pairs: [
      { question: "How can I contact you?", answer: "You can reach me through any of the contact methods listed on my card — phone, email, or social media." },
      { question: "What is the best way to reach you?", answer: "The fastest way is through the direct messaging options on my card. I typically respond within 24 hours." },
      { question: "Do you offer customer support after purchase?", answer: "Absolutely! I provide ongoing support to all my customers. Don't hesitate to reach out anytime." },
    ],
  },
  {
    name: "Shipping & Delivery",
    description: "Questions about shipping and delivery",
    pairs: [
      { question: "Do you offer delivery?", answer: "Yes, we offer delivery options. Please contact me to discuss delivery arrangements for your area." },
      { question: "How long does delivery take?", answer: "Delivery times vary by location. Please contact me for estimated delivery times to your area." },
      { question: "Do you ship nationwide?", answer: "Yes, we can arrange nationwide shipping. Contact me for shipping rates and timelines." },
    ],
  },
];

interface TemplateQADialogProps {
  cardId?: string | null;
  onImported: () => void;
  existingCount: number;
}

export function TemplateQADialog({ cardId, onImported, existingCount }: TemplateQADialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const toggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const totalPairs = Array.from(selected).reduce((sum, idx) => sum + TEMPLATE_SETS[idx].pairs.length, 0);

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);

    let offset = 0;
    const rows = Array.from(selected).flatMap(idx => 
      TEMPLATE_SETS[idx].pairs.map((p, i) => ({
        question: p.question,
        answer: p.answer,
        card_id: cardId ?? null,
        sort_order: existingCount + offset + i,
      }))
    );

    const { error } = await supabase.from("ai_training_qa").insert(rows);

    if (error) {
      toast.error("Failed to import templates");
      console.error(error);
    } else {
      toast.success(`${totalPairs} Q&A pairs added from templates`);
      setOpen(false);
      setSelected(new Set());
      onImported();
    }
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelected(new Set()); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <LayoutTemplate className="h-3.5 w-3.5" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Q&A Template Sets
          </DialogTitle>
          <DialogDescription>
            Select template sets to quickly populate your chatbot knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {TEMPLATE_SETS.map((tpl, idx) => {
            const isSelected = selected.has(idx);
            return (
              <button
                key={idx}
                onClick={() => toggle(idx)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{tpl.pairs.length} Q&A</Badge>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={importing || selected.size === 0} className="gap-1.5">
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LayoutTemplate className="h-3.5 w-3.5" />}
            Add {totalPairs} Q&A pairs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
