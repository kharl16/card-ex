import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Record<string, any>;
  productImages?: Array<{ image_url: string; alt_text?: string | null; description?: string | null }>;
  onSaved?: () => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  card,
  productImages,
  onSaved,
}: SaveTemplateDialogProps) {
  const { isAdmin } = useAuth();
  const { saveAsGlobalTemplate, savePersonalTemplate, hasPersonalTemplate, userTemplate } = useTemplates();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveAsGlobal, setSaveAsGlobal] = useState(isAdmin); // Default to global for admins
  const [cardLinks, setCardLinks] = useState<Array<{ kind: string; label: string; value: string; icon?: string | null; sort_index?: number | null }>>([]);

  // Pre-fill name from card when dialog opens
  useEffect(() => {
    if (open && card.full_name) {
      setName(`${card.full_name} Template`);
    }
  }, [open, card.full_name]);

  // Fetch card links when dialog opens
  useEffect(() => {
    if (open && card.id) {
      fetchCardLinks();
    }
  }, [open, card.id]);

  const fetchCardLinks = async () => {
    if (!card.id) return;
    
    const { data, error } = await supabase
      .from("card_links")
      .select("kind, label, value, icon, sort_index")
      .eq("card_id", card.id)
      .order("sort_index");
    
    if (!error && data) {
      setCardLinks(data);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      let success = false;

      if (isAdmin && saveAsGlobal) {
        success = await saveAsGlobalTemplate(card, name.trim(), description.trim(), undefined, productImages, cardLinks);
      } else {
        success = await savePersonalTemplate(card, name.trim(), description.trim(), productImages, cardLinks);
      }

      if (success) {
        setName("");
        setDescription("");
        setSaveAsGlobal(false);
        setCardLinks([]);
        onOpenChange(false);
        onSaved?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
      setSaveAsGlobal(false);
      setCardLinks([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            {hasPersonalTemplate && !isAdmin
              ? "You already have a personal template. This will overwrite it."
              : "Save this card as a reusable template with all content included."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Business Card Template"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A professional template with gold accents..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-primary">Full Card Template</p>
            <p className="text-muted-foreground">
              This template will include all content: design, personal info, images, and links.
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <input
                type="checkbox"
                id="save-global"
                checked={saveAsGlobal}
                onChange={(e) => setSaveAsGlobal(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="save-global" className="cursor-pointer text-sm">
                Save as <span className="font-semibold text-primary">Global Template</span>
                <span className="block text-xs text-muted-foreground">
                  Available to all users
                </span>
              </Label>
            </div>
          )}

          {hasPersonalTemplate && userTemplate && !saveAsGlobal && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Overwriting existing template
              </p>
              <p className="text-muted-foreground">
                Your current template "{userTemplate.name}" will be replaced.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasPersonalTemplate && !saveAsGlobal ? "Overwrite Template" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
